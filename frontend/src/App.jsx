import { useState } from 'react'
import { Package, Users, ClipboardList, Receipt, FireExtinguisher, BarChart3, LogOut } from 'lucide-react'
import { auth } from './api'
import Login from './Login'
import Products from './Products'
import Clients from './Clients'
import Orders from './Orders'
import Expenses from './Expenses'
import Reports from './Reports'
import FireExtinguishers from './FireExtinguishers'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

const TABS = {
  products: { label: 'Productos', Icon: Package, Component: Products },
  clients: { label: 'Clientes', Icon: Users, Component: Clients },
  orders: { label: 'Pedidos', Icon: ClipboardList, Component: Orders },
  expenses: { label: 'Gastos', Icon: Receipt, Component: Expenses },
  fireExtinguishers: {
    label: 'Matafuegos',
    Icon: FireExtinguisher,
    Component: FireExtinguishers,
  },
  reports: { label: 'Reportes', Icon: BarChart3, Component: Reports },
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

  const { Component, label } = TABS[tab]

  return (
    <div className="min-h-screen bg-brand-gray">
      <Sidebar tabs={TABS} active={tab} onSelect={setTab} onLogout={handleLogout} />

      <div className="md:pl-60">
        <header className="md:hidden sticky top-0 z-20 bg-brand-black text-white px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/40 leading-none">HB Servicios</p>
            <h1 key={tab} className="text-base font-semibold leading-tight animate-fade-in-fast">
              {label}
            </h1>
          </div>
          <button onClick={handleLogout} aria-label="Cerrar sesión" className="text-white/70 p-2 -mr-2">
            <LogOut size={20} />
          </button>
        </header>

        <main className="p-4 md:p-8 pb-24 md:pb-8">
          <div key={tab} className="animate-fade-in">
            <Component />
          </div>
        </main>
      </div>

      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </div>
  )
}

export default App
