import { db } from './db'

// En producción el mismo proceso Node sirve el frontend y la API bajo
// /api (ver ServeStaticModule/setGlobalPrefix en el backend), así que basta
// una ruta relativa. En desarrollo, Vite corre en otro puerto que el
// backend (5173 vs 3000), así que hace falta el host completo. Se puede
// pisar con VITE_API_URL si hiciera falta otro esquema de despliegue.
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api')

// fetch() rechaza con un TypeError cuando no hay conexión (a diferencia de
// un error HTTP normal, que ya llega como Error con el mensaje del backend).
function isNetworkError(err) {
  return err instanceof TypeError
}

export function errorMessage(err) {
  return isNetworkError(err) ? 'Sin conexión con el servidor.' : err.message
}

function getToken() {
  return localStorage.getItem('token')
}

function setToken(token) {
  if (token) localStorage.setItem('token', token)
  else localStorage.removeItem('token')
}

// Los PDF no son JSON: se piden aparte y se devuelven como Blob.
async function fetchPdf(path) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  return res.blob()
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Error ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export const auth = {
  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setToken(data.accessToken)
    return data
  },
  logout() {
    setToken(null)
  },
  isLoggedIn() {
    return Boolean(getToken())
  },
}

export const products = {
  async list(includeInactive = false) {
    try {
      const data = await request(`/products?includeInactive=${includeInactive}`)
      if (!includeInactive) {
        await db.products.clear()
        await db.products.bulkPut(data)
      }
      return data
    } catch (err) {
      if (isNetworkError(err)) return db.products.toArray()
      throw err
    }
  },
  create(dto) {
    return request('/products', { method: 'POST', body: JSON.stringify(dto) })
  },
  update(id, dto) {
    return request(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
  },
  adjustStock(id, delta, reason) {
    return request(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ delta, reason }),
    })
  },
  linkEmptyProduct(fullProductId, emptyProductId) {
    return request(`/products/${fullProductId}/link-empty`, {
      method: 'PATCH',
      body: JSON.stringify({ emptyProductId }),
    })
  },
  deactivate(id) {
    return request(`/products/${id}`, { method: 'DELETE' })
  },
  remove(id) {
    return request(`/products/${id}/permanent`, { method: 'DELETE' })
  },
}

export const clients = {
  async list(includeInactive = false) {
    try {
      const data = await request(`/clients?includeInactive=${includeInactive}`)
      if (!includeInactive) {
        await db.clients.clear()
        await db.clients.bulkPut(data)
      }
      return data
    } catch (err) {
      if (isNetworkError(err)) return db.clients.toArray()
      throw err
    }
  },
  create(dto) {
    return request('/clients', { method: 'POST', body: JSON.stringify(dto) })
  },
  update(id, dto) {
    return request(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
  },
  deactivate(id) {
    return request(`/clients/${id}`, { method: 'DELETE' })
  },
  listLoans(clientId, includeReturned = false) {
    return request(`/clients/${clientId}/loans?includeReturned=${includeReturned}`)
  },
  createLoan(clientId, dto) {
    return request(`/clients/${clientId}/loans`, {
      method: 'POST',
      body: JSON.stringify(dto),
    })
  },
  returnLoan(clientId, loanId) {
    return request(`/clients/${clientId}/loans/${loanId}/return`, {
      method: 'PATCH',
    })
  },
}

export const orders = {
  // params: { from, to, search, page, pageSize } — con page, la respuesta
  // es { data, total, page, pageSize }.
  list(params = {}) {
    return request(`/orders${toQuery(params)}`)
  },
  get(id) {
    return request(`/orders/${id}`)
  },
  update(id, dto) {
    return request(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
  },
  remove(id) {
    return request(`/orders/${id}`, { method: 'DELETE' })
  },
  async create(dto) {
    try {
      return await request('/orders', { method: 'POST', body: JSON.stringify(dto) })
    } catch (err) {
      if (!isNetworkError(err)) throw err
      const localId = await db.pendingOrders.add({
        payload: dto,
        createdAt: new Date().toISOString(),
      })
      return { pending: true, localId }
    }
  },
  downloadPdf(id) {
    return fetchPdf(`/orders/${id}/pdf`)
  },
  listPending() {
    return db.pendingOrders.toArray()
  },
  discardPending(localId) {
    return db.pendingOrders.delete(localId)
  },
  async syncPending() {
    const pending = await db.pendingOrders.toArray()
    let synced = 0
    let failed = 0
    for (const p of pending) {
      try {
        await request('/orders', { method: 'POST', body: JSON.stringify(p.payload) })
        await db.pendingOrders.delete(p.localId)
        synced++
      } catch (err) {
        if (isNetworkError(err)) break // seguimos sin conexión, cortamos acá
        failed++ // el backend lo rechazó (p.ej. cambió el stock); queda en la cola para revisar a mano
      }
    }
    return { synced, failed, remaining: pending.length - synced }
  },
}

export const expenses = {
  // Mismo esquema de params que orders.list.
  list(productId, params = {}) {
    return request(`/expenses${toQuery({ productId, ...params })}`)
  },
  create(dto) {
    return request('/expenses', { method: 'POST', body: JSON.stringify(dto) })
  },
  update(id, dto) {
    return request(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
  },
  remove(id) {
    return request(`/expenses/${id}`, { method: 'DELETE' })
  },
}

function toQuery(params) {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') usp.set(key, value)
  }
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

export const reports = {
  sales(from, to) {
    return request(`/reports/sales${toQuery({ from, to })}`)
  },
  stockMovements(productId, from, to, page, pageSize) {
    return request(`/reports/stock-movements${toQuery({ productId, from, to, page, pageSize })}`)
  },
  balance(from, to) {
    return request(`/reports/balance${toQuery({ from, to })}`)
  },
  fireExtinguisherAlerts(daysAhead) {
    return request(`/reports/fire-extinguisher-alerts${toQuery({ daysAhead })}`)
  },
  purchasesBySupplier(from, to) {
    return request(`/reports/purchases-by-supplier${toQuery({ from, to })}`)
  },
}

export const fireExtinguishers = {
  list() {
    return request('/fire-extinguishers')
  },
  create(dto) {
    return request('/fire-extinguishers', { method: 'POST', body: JSON.stringify(dto) })
  },
  update(id, dto) {
    return request(`/fire-extinguishers/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
  },
  remove(id) {
    return request(`/fire-extinguishers/${id}`, { method: 'DELETE' })
  },
  downloadPdf(id) {
    return fetchPdf(`/fire-extinguishers/${id}/pdf`)
  },
}

export const suppliers = {
  list(includeInactive = false) {
    return request(`/suppliers?includeInactive=${includeInactive}`)
  },
  create(dto) {
    return request('/suppliers', { method: 'POST', body: JSON.stringify(dto) })
  },
  update(id, dto) {
    return request(`/suppliers/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
  },
  deactivate(id) {
    return request(`/suppliers/${id}`, { method: 'DELETE' })
  },
}
