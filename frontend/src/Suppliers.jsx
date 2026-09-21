import { useEffect, useState } from 'react'
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { errorMessage, suppliers } from './api'

const EMPTY_FORM = { name: '', phone: '', address: '', email: '', active: true }

function Suppliers() {
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  async function load() {
    setError('')
    try {
      setList(await suppliers.list(showInactive))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    load()
  }, [showInactive])

  function startEdit(supplier) {
    setEditingId(supplier.id)
    setForm({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || '',
      email: supplier.email || '',
      active: supplier.active,
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
      const payload = {
        ...form,
        phone: form.phone || undefined,
        address: form.address || undefined,
        email: form.email || undefined,
      }
      if (editingId) {
        await suppliers.update(editingId, payload)
      } else {
        await suppliers.create(payload)
      }
      setEditingId(null)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleDeactivate(id) {
    if (!window.confirm('¿Dar de baja este proveedor?')) return
    try {
      await suppliers.deactivate(id)
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
          <label className="block text-xs text-slate-500 mb-1">Teléfono</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Dirección</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
        </div>
        {editingId && (
          <label className="flex items-center gap-2 text-sm text-slate-700 pb-1.5">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Activo
          </label>
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
        Mostrar proveedores dados de baja
      </label>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Teléfono</th>
                <th className="px-4 py-2">Dirección</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr
                  key={s.id}
                  className={`border-t border-slate-100 transition-colors hover:bg-slate-50 ${!s.active ? 'text-slate-400' : ''}`}
                >
                  <td className="px-4 py-2">
                    {s.name}
                    {!s.active && ' (baja)'}
                  </td>
                  <td className="px-4 py-2">{s.phone || '-'}</td>
                  <td className="px-4 py-2">{s.address || '-'}</td>
                  <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => startEdit(s)}
                      title="Editar"
                      aria-label="Editar"
                      className="text-slate-600 hover:text-brand-red transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    {s.active && (
                      <button
                        onClick={() => handleDeactivate(s.id)}
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
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No hay proveedores cargados todavía.
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

export default Suppliers
