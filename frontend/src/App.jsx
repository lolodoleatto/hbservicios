import { useState } from 'react'
import { auth } from './api'
import Login from './Login'
import Products from './Products'
import Clients from './Clients'
import Orders from './Orders'

const TABS = {
  products: { label: 'Productos', Component: Products },
  clients: { label: 'Clientes', Component: Clients },
  orders: { label: 'Pedidos', Component: Orders },
}

function App() {
  const [loggedIn, setLoggedIn] = useState(auth.isLoggedIn())
  const [tab, setTab] = useState('products')

  function handleLogout() {
    auth.logout()
    setLoggedIn(false)
  }

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />
  }

  const { Component } = TABS[tab]

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6">
        <div className="flex gap-4">
          {Object.entries(TABS).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`text-lg font-semibold ${
                tab === key ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Cerrar sesión
        </button>
      </div>

      <Component />
    </div>
  )
}

export default App
