import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, FireExtinguisher, Repeat } from 'lucide-react'
import { clients, errorMessage, fireExtinguishers, products, reports } from './api'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function plusOneYear(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

const EMPTY_FORM = {
  clientId: '',
  productId: '',
  amount: '',
}

function FireExtinguishers() {
  const [list, setList] = useState([])
  const [clientList, setClientList] = useState([])
  const [productList, setProductList] = useState([])
  const [alerts, setAlerts] = useState([])
  const [daysAhead, setDaysAhead] = useState('30')
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [expiresAt, setExpiresAt] = useState(plusOneYear(todayIso()))
  const formRef = useRef(null)

  async function load() {
    setError('')
    try {
      setList(await fireExtinguishers.list())
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function loadAlerts() {
    try {
      setAlerts(await reports.fireExtinguisherAlerts(daysAhead))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    load()
    clients.list().then(setClientList).catch((err) => setError(errorMessage(err)))
    products
      .list()
      .then((data) => setProductList(data.filter((p) => p.type === 'fire_extinguisher')))
      .catch((err) => setError(errorMessage(err)))
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [daysAhead])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await fireExtinguishers.create({
        clientId: Number(form.clientId),
        productId: Number(form.productId),
        amount: form.amount !== '' ? Number(form.amount) : undefined,
        expiresAt,
      })
      setForm(EMPTY_FORM)
      setExpiresAt(plusOneYear(todayIso()))
      load()
      loadAlerts()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function startRecharge(alert) {
    if (!alert.clientId) return
    setForm({ clientId: String(alert.clientId), productId: String(alert.productId), amount: '' })
    setExpiresAt(plusOneYear(todayIso()))
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const expired = alerts.filter((a) => a.expired)
  const upcoming = alerts.filter((a) => !a.expired)

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <p className="bg-red-100 text-red-700 text-sm rounded px-3 py-2 mb-4 animate-fade-in-fast">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <AlertTriangle size={18} className="text-brand-red" />
          Vencidos y próximos a vencer
        </h2>
        <label className="text-sm text-slate-600 flex items-center gap-2">
          Próximos
          <input
            type="number"
            min="1"
            value={daysAhead}
            onChange={(e) => setDaysAhead(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 w-16 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
          días
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700 mb-2">
            <AlertTriangle size={15} />
            Vencidos ({expired.length})
          </p>
          {expired.length === 0 ? (
            <p className="text-sm text-red-700/60">Ninguno vencido, buen trabajo.</p>
          ) : (
            <ul className="space-y-1.5">
              {expired.map((a) => (
                <li key={a.id} className="text-sm text-red-800 flex items-center justify-between gap-2">
                  <span className="truncate">
                    {a.clientName} — {a.productName}
                  </span>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-xs text-red-600">
                      {new Date(a.expiresAt).toLocaleDateString('es-AR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => startRecharge(a)}
                      disabled={!a.clientId}
                      title={
                        a.clientId
                          ? 'Recargar este matafuego'
                          : 'Sin cliente asociado (pedido a consumidor final), no se puede precargar'
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Repeat size={12} />
                      Recargar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 mb-2">
            <Clock size={15} />
            Próximos a vencer ({upcoming.length})
          </p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-amber-700/60">Nada por vencer en este rango.</p>
          ) : (
            <ul className="space-y-1.5">
              {upcoming.map((a) => (
                <li key={a.id} className="text-sm text-amber-800 flex items-center justify-between gap-2">
                  <span className="truncate">
                    {a.clientName} — {a.productName}
                  </span>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-xs text-amber-600">
                      {new Date(a.expiresAt).toLocaleDateString('es-AR')}
                    </span>
                    <button
                      type="button"
                      onClick={() => startRecharge(a)}
                      disabled={!a.clientId}
                      title={
                        a.clientId
                          ? 'Recargar este matafuego'
                          : 'Sin cliente asociado (pedido a consumidor final), no se puede precargar'
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Repeat size={12} />
                      Recargar
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h2 ref={formRef} className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-3">
        <FireExtinguisher size={18} className="text-brand-red" />
        Recarga de matafuego
      </h2>
      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cliente</label>
            <select
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              required
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            >
              <option value="">Seleccionar...</option>
              {clientList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Matafuego</label>
            <select
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
              required
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            >
              <option value="">Seleccionar...</option>
              {productList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Monto de recarga</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0"
              className="border border-slate-300 rounded px-2 py-1 w-32 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nuevo vencimiento</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-brand-red text-white rounded px-4 py-1.5 hover:bg-brand-red-dark transition-all active:scale-95"
          >
            <FireExtinguisher size={15} />
            Registrar recarga
          </button>
        </div>
      </form>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Fecha de recarga</th>
              <th className="px-4 py-2">Vencimiento</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {list.map((fe) => {
              const isExpired = new Date(`${fe.expiresAt}T00:00:00`) < new Date()
              return (
                <tr key={fe.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                  <td className="px-4 py-2">{fe.client?.name}</td>
                  <td className="px-4 py-2">{fe.product?.name}</td>
                  <td className="px-4 py-2">
                    {new Date(`${fe.soldAt}T00:00:00`).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-2">
                    {new Date(`${fe.expiresAt}T00:00:00`).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-2">
                    {fe.amount ? `$${Number(fe.amount).toLocaleString('es-AR')}` : '-'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center gap-1 ${isExpired ? 'text-red-700' : 'text-emerald-700'}`}
                    >
                      {isExpired ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                      {isExpired ? 'Vencido' : 'Vigente'}
                    </span>
                  </td>
                </tr>
              )
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No hay recargas registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

export default FireExtinguishers
