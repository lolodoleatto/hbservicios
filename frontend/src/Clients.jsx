import { useEffect, useState } from 'react'
import { CheckCircle2, PackagePlus, Pencil, Plus, Save, Trash2, Users, X } from 'lucide-react'
import { clients, errorMessage, products } from './api'

const EMPTY_FORM = { name: '', phone: '', address: '', email: '', active: true }
const EMPTY_LOAN_FORM = { productId: '', quantity: '1', notes: '' }

function Clients() {
  const [list, setList] = useState([])
  const [productList, setProductList] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  const [selectedClientId, setSelectedClientId] = useState('')
  const [loans, setLoans] = useState([])
  const [loanForm, setLoanForm] = useState(EMPTY_LOAN_FORM)

  async function load() {
    setError('')
    try {
      setList(await clients.list(showInactive))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function loadLoans(clientId) {
    if (!clientId) {
      setLoans([])
      return
    }
    try {
      setLoans(await clients.listLoans(clientId))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    load()
    products.list().then(setProductList).catch((err) => setError(errorMessage(err)))
  }, [showInactive])

  useEffect(() => {
    loadLoans(selectedClientId)
  }, [selectedClientId])

  function startEdit(client) {
    setEditingId(client.id)
    setForm({
      name: client.name,
      phone: client.phone || '',
      address: client.address || '',
      email: client.email || '',
      active: client.active,
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
        await clients.update(editingId, form)
      } else {
        await clients.create(form)
      }
      setEditingId(null)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleDeactivate(id) {
    if (!window.confirm('¿Dar de baja este cliente?')) return
    try {
      await clients.deactivate(id)
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleCreateLoan(e) {
    e.preventDefault()
    setError('')
    try {
      await clients.createLoan(selectedClientId, {
        productId: Number(loanForm.productId),
        quantity: Number(loanForm.quantity),
        notes: loanForm.notes || undefined,
      })
      setLoanForm(EMPTY_LOAN_FORM)
      loadLoans(selectedClientId)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleReturnLoan(loanId) {
    try {
      await clients.returnLoan(selectedClientId, loanId)
      loadLoans(selectedClientId)
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
        Mostrar clientes dados de baja
      </label>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
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
            {list.map((c) => (
              <tr
                key={c.id}
                className={`border-t border-slate-100 transition-colors hover:bg-slate-50 ${!c.active ? 'text-slate-400' : ''}`}
              >
                <td className="px-4 py-2">
                  {c.name}
                  {!c.active && ' (baja)'}
                </td>
                <td className="px-4 py-2">{c.phone || '-'}</td>
                <td className="px-4 py-2">{c.address || '-'}</td>
                <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                  <button
                    onClick={() => startEdit(c)}
                    title="Editar"
                    aria-label="Editar"
                    className="text-slate-600 hover:text-brand-red transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedClientId(String(c.id))}
                    title="Ver préstamos"
                    aria-label="Ver préstamos"
                    className="text-slate-600 hover:text-brand-red transition-colors"
                  >
                    <PackagePlus size={16} />
                  </button>
                  {c.active && (
                    <button
                      onClick={() => handleDeactivate(c.id)}
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
                  No hay clientes cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Users size={18} className="text-brand-red" />
            Préstamo de envases
          </h2>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          >
            <option value="">Seleccionar cliente...</option>
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {selectedClientId && (
          <div className="animate-fade-in">
            <form
              onSubmit={handleCreateLoan}
              className="flex flex-wrap gap-3 items-end mb-4"
            >
              <div>
                <label className="block text-xs text-slate-500 mb-1">Producto</label>
                <select
                  value={loanForm.productId}
                  onChange={(e) => setLoanForm({ ...loanForm, productId: e.target.value })}
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
                  value={loanForm.quantity}
                  onChange={(e) => setLoanForm({ ...loanForm, quantity: e.target.value })}
                  required
                  className="border border-slate-300 rounded px-2 py-1 w-20 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notas</label>
                <input
                  value={loanForm.notes}
                  onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
                  className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-brand-red text-white rounded px-4 py-1.5 hover:bg-brand-red-dark transition-all active:scale-95"
              >
                <PackagePlus size={15} />
                Registrar préstamo
              </button>
            </form>

            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Cantidad</th>
                  <th className="px-4 py-2">Notas</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="px-4 py-2">{l.product?.name}</td>
                    <td className="px-4 py-2">{l.quantity}</td>
                    <td className="px-4 py-2">{l.notes || '-'}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleReturnLoan(l.id)}
                        title="Marcar devuelto"
                        aria-label="Marcar devuelto"
                        className="text-slate-600 hover:text-brand-red transition-colors"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      Sin préstamos activos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Clients
