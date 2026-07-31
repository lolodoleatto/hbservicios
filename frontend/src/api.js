import { db } from './db'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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
  deactivate(id) {
    return request(`/products/${id}`, { method: 'DELETE' })
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
  list() {
    return request('/orders')
  },
  get(id) {
    return request(`/orders/${id}`)
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
  async downloadPdf(id) {
    const token = getToken()
    const res = await fetch(`${API_URL}/orders/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`Error ${res.status}`)
    return res.blob()
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
