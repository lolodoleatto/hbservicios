const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

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
  list(includeInactive = false) {
    return request(`/products?includeInactive=${includeInactive}`)
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
