import { useEffect, useState } from 'react'
import { PackagePlus, Plus } from 'lucide-react'
import { errorMessage, expenses, products } from './api'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_FORM = {
  description: '',
  amount: '',
  category: '',
  date: todayIso(),
}
const EMPTY_STOCK = { productId: '', quantity: '1' }

function Expenses() {
  const [list, setList] = useState([])
  const [productList, setProductList] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [isStockEntry, setIsStockEntry] = useState(false)
  const [stock, setStock] = useState({ ...EMPTY_STOCK })

  async function load() {
    setError('')
    try {
      setList(await expenses.list())
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    load()
    products.list().then(setProductList).catch((err) => setError(errorMessage(err)))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        description: form.description,
        amount: Number(form.amount),
        category: form.category || undefined,
        date: form.date,
      }
      if (isStockEntry && stock.productId) {
        payload.productId = Number(stock.productId)
        payload.quantity = Number(stock.quantity)
      }
      await expenses.create(payload)
      setForm({ ...EMPTY_FORM, date: form.date })
      setIsStockEntry(false)
      setStock({ ...EMPTY_STOCK })
      load()
      products.list().then(setProductList)
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
            <label className="block text-xs text-slate-500 mb-1">Descripción</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Categoría</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Alquiler, sueldos, combustible..."
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Monto total</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              className="border border-slate-300 rounded px-2 py-1 w-28 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 mb-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 mb-2">
            <input
              type="checkbox"
              checked={isStockEntry}
              onChange={(e) => setIsStockEntry(e.target.checked)}
            />
            Este gasto es un ingreso de stock (p.ej. compra de garrafas)
          </label>
          {isStockEntry && (
            <div className="flex flex-wrap gap-3 items-end animate-fade-in">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Producto que ingresa</label>
                <select
                  value={stock.productId}
                  onChange={(e) => setStock({ ...stock, productId: e.target.value })}
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
                <label className="block text-xs text-slate-500 mb-1">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={stock.quantity}
                  onChange={(e) => setStock({ ...stock, quantity: e.target.value })}
                  required
                  className="border border-slate-300 rounded px-2 py-1 w-20 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                />
              </div>
              {stock.productId && form.amount && (
                <p className="inline-flex items-center gap-1 text-xs text-slate-400 pb-1.5">
                  <PackagePlus size={13} />
                  Costo unitario: $
                  {(Number(form.amount) / (Number(stock.quantity) || 1)).toLocaleString('es-AR', {
                    maximumFractionDigits: 2,
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 bg-brand-red text-white rounded px-4 py-1.5 hover:bg-brand-red-dark transition-all active:scale-95"
        >
          <Plus size={15} />
          Registrar gasto
        </button>
      </form>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Descripción</th>
              <th className="px-4 py-2">Categoría</th>
              <th className="px-4 py-2">Ingreso de stock</th>
              <th className="px-4 py-2">Monto</th>
            </tr>
          </thead>
          <tbody>
            {list.map((exp) => (
              <tr key={exp.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                <td className="px-4 py-2">
                  {new Date(exp.date).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
                </td>
                <td className="px-4 py-2">{exp.description}</td>
                <td className="px-4 py-2">{exp.category || '-'}</td>
                <td className="px-4 py-2">
                  {exp.product ? `${exp.product.name} (+${exp.quantity})` : '-'}
                </td>
                <td className="px-4 py-2">${Number(exp.amount).toLocaleString('es-AR')}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No hay gastos cargados todavía.
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

export default Expenses
