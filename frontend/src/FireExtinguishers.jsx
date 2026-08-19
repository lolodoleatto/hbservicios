import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, FireExtinguisher } from 'lucide-react'
import { clients, errorMessage, fireExtinguishers, products } from './api'

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
  soldAt: todayIso(),
  notes: '',
}

function FireExtinguishers() {
  const [list, setList] = useState([])
  const [clientList, setClientList] = useState([])
  const [productList, setProductList] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [autoExpiry, setAutoExpiry] = useState(true)
  const [expiresAt, setExpiresAt] = useState(plusOneYear(todayIso()))

  async function load() {
    setError('')
    try {
      setList(await fireExtinguishers.list())
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
    if (autoExpiry) setExpiresAt(plusOneYear(form.soldAt || todayIso()))
  }, [form.soldAt, autoExpiry])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await fireExtinguishers.create({
        clientId: Number(form.clientId),
        productId: Number(form.productId),
        soldAt: form.soldAt,
        expiresAt,
        notes: form.notes || undefined,
      })
      setForm(EMPTY_FORM)
      setAutoExpiry(true)
      setExpiresAt(plusOneYear(todayIso()))
      load()
      products
        .list()
        .then((data) => setProductList(data.filter((p) => p.type === 'fire_extinguisher')))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <p className="bg-red-100 text-red-700 text-sm rounded px-3 py-2 mb-4 animate-fade-in-fast">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cliente/empresa</label>
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
                  {p.name} (stock: {p.stock})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha de venta</label>
            <input
              type="date"
              value={form.soldAt}
              onChange={(e) => setForm({ ...form, soldAt: e.target.value })}
              required
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 mb-2">
            <input
              type="checkbox"
              checked={autoExpiry}
              onChange={(e) => setAutoExpiry(e.target.checked)}
            />
            Vencimiento automático (fecha de venta + 1 año)
          </label>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha de vencimiento</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={autoExpiry}
              required
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs text-slate-500 mb-1">Notas</label>
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Recarga anual, venta nueva, etc."
            className="border border-slate-300 rounded px-2 py-1 w-full transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 bg-brand-red text-white rounded px-4 py-1.5 hover:bg-brand-red-dark transition-all active:scale-95"
        >
          <FireExtinguisher size={15} />
          Registrar matafuego
        </button>
      </form>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Fecha de venta</th>
              <th className="px-4 py-2">Vencimiento</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Notas</th>
            </tr>
          </thead>
          <tbody>
            {list.map((fe) => {
              const expired = new Date(`${fe.expiresAt}T00:00:00`) < new Date()
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
                    <span
                      className={`inline-flex items-center gap-1 ${expired ? 'text-red-700' : 'text-emerald-700'}`}
                    >
                      {expired ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                      {expired ? 'Vencido' : 'Vigente'}
                    </span>
                  </td>
                  <td className="px-4 py-2">{fe.notes || '-'}</td>
                </tr>
              )
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No hay matafuegos registrados todavía.
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
