import { useEffect, useState } from 'react'
import { products } from './api'

const TYPE_LABELS = {
  gas_cylinder_full: 'Garrafa llena',
  gas_cylinder_empty: 'Garrafa vacía',
  fire_extinguisher: 'Matafuego',
}

const EMPTY_FORM = {
  name: '',
  type: 'gas_cylinder_full',
  currentPrice: '',
  stock: '',
}

function Products({ onLogout }) {
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  async function load() {
    setError('')
    try {
      setList(await products.list())
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    try {
      await products.create({
        name: form.name,
        type: form.type,
        currentPrice: Number(form.currentPrice),
        stock: form.stock === '' ? 0 : Number(form.stock),
      })
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAdjustStock(id) {
    const delta = window.prompt('¿Cuánto stock sumar o restar? (negativo para restar)')
    if (!delta) return
    const reason = window.prompt('Motivo del ajuste') || 'Ajuste manual'
    try {
      await products.adjustStock(id, Number(delta), reason)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeactivate(id) {
    if (!window.confirm('¿Dar de baja este producto?')) return
    try {
      await products.deactivate(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-slate-800">Productos y stock</h1>
          <button
            onClick={onLogout}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Cerrar sesión
          </button>
        </div>

        {error && (
          <p className="bg-red-100 text-red-700 text-sm rounded px-3 py-2 mb-4">{error}</p>
        )}

        <form
          onSubmit={handleCreate}
          className="bg-white shadow-sm rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end"
        >
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="border border-slate-300 rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="border border-slate-300 rounded px-2 py-1"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Precio</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.currentPrice}
              onChange={(e) => setForm({ ...form, currentPrice: e.target.value })}
              required
              className="border border-slate-300 rounded px-2 py-1 w-28"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Stock inicial</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="border border-slate-300 rounded px-2 py-1 w-24"
            />
          </div>
          <button
            type="submit"
            className="bg-slate-800 text-white rounded px-4 py-1.5 hover:bg-slate-700"
          >
            Agregar
          </button>
        </form>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Precio</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{TYPE_LABELS[p.type] || p.type}</td>
                  <td className="px-4 py-2">${Number(p.currentPrice).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-2">{p.stock}</td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <button
                      onClick={() => handleAdjustStock(p.id)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Ajustar stock
                    </button>
                    <button
                      onClick={() => handleDeactivate(p.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Dar de baja
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No hay productos cargados todavía.
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

export default Products
