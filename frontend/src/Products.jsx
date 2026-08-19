import { useEffect, useState } from 'react'
import { Pencil, Plus, Save, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { errorMessage, products } from './api'

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
  active: true,
}

function Products() {
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  async function load() {
    setError('')
    try {
      setList(await products.list(showInactive))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    load()
  }, [showInactive])

  function startEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      type: product.type,
      currentPrice: product.currentPrice,
      stock: '',
      active: product.active,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      if (editingId) {
        await products.update(editingId, {
          name: form.name,
          type: form.type,
          currentPrice: Number(form.currentPrice),
          active: form.active,
        })
      } else {
        await products.create({
          name: form.name,
          type: form.type,
          currentPrice: Number(form.currentPrice),
          stock: form.stock === '' ? 0 : Number(form.stock),
        })
      }
      setEditingId(null)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setError(errorMessage(err))
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
      setError(errorMessage(err))
    }
  }

  async function handleDeactivate(id) {
    if (!window.confirm('¿Dar de baja este producto?')) return
    try {
      await products.deactivate(id)
      load()
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

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-sm rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end"
      >
        <div>
          <label className="block text-xs text-slate-500 mb-1">Nombre</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tipo</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
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
            className="border border-slate-300 rounded px-2 py-1 w-28 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
        </div>
        {editingId ? (
          <label className="flex items-center gap-2 text-sm text-slate-700 pb-1.5">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Activo
          </label>
        ) : (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Stock inicial</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="border border-slate-300 rounded px-2 py-1 w-24 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
          </div>
        )}
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 bg-brand-red text-white rounded px-4 py-1.5 hover:bg-brand-red-dark transition-all active:scale-95"
        >
          {editingId ? <Save size={15} /> : <Plus size={15} />}
          {editingId ? 'Guardar cambios' : 'Agregar'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={cancelEdit}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 pb-1.5 transition-colors"
          >
            <X size={15} />
            Cancelar
          </button>
        )}
      </form>

      <label className="flex items-center gap-2 text-sm text-slate-600 mb-3">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
        />
        Mostrar productos dados de baja
      </label>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
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
              <tr
                key={p.id}
                className={`border-t border-slate-100 transition-colors hover:bg-slate-50 ${!p.active ? 'text-slate-400' : ''}`}
              >
                <td className="px-4 py-2">
                  {p.name}
                  {!p.active && ' (baja)'}
                </td>
                <td className="px-4 py-2">{TYPE_LABELS[p.type] || p.type}</td>
                <td className="px-4 py-2">${Number(p.currentPrice).toLocaleString('es-AR')}</td>
                <td className="px-4 py-2">{p.stock}</td>
                <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => startEdit(p)}
                    title="Editar"
                    aria-label="Editar"
                    className="text-slate-600 hover:text-brand-red transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleAdjustStock(p.id)}
                    title="Ajustar stock"
                    aria-label="Ajustar stock"
                    className="text-slate-600 hover:text-brand-red transition-colors"
                  >
                    <SlidersHorizontal size={16} />
                  </button>
                  {p.active && (
                    <button
                      onClick={() => handleDeactivate(p.id)}
                      title="Dar de baja"
                      aria-label="Dar de baja"
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
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
