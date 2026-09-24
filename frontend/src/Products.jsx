import { Fragment, useEffect, useState } from 'react'
import {
  History,
  Pencil,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  X,
  XCircle,
} from 'lucide-react'
import { errorMessage, expenses, products } from './api'
import { firstMissing } from './validation'

const TYPE_LABELS = {
  gas_cylinder_full: 'Garrafa llena',
  gas_cylinder_empty: 'Garrafa vacía',
  fire_extinguisher: 'Matafuego',
}

const TYPE_ORDER = ['gas_cylinder_full', 'gas_cylinder_empty', 'fire_extinguisher']

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
  const [expandedId, setExpandedId] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [stockModal, setStockModal] = useState(null)
  const [stockForm, setStockForm] = useState({ quantity: '', reason: '' })

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
    const missing = firstMissing([
      ['Nombre', form.name],
      ['Precio', form.currentPrice],
    ])
    if (missing) {
      setError(missing)
      return
    }
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

  function openStockModal(product) {
    setStockModal({ product, isEmpty: product.type === 'gas_cylinder_empty' })
    setStockForm({ quantity: '', reason: '' })
    setError('')
  }

  function closeStockModal() {
    setStockModal(null)
  }

  async function submitStockAdjust(e) {
    e.preventDefault()
    setError('')
    const missing = firstMissing([['Cantidad', stockForm.quantity]])
    if (missing) {
      setError(missing)
      return
    }
    const qty = Number(stockForm.quantity)
    if (!qty || (stockModal.isEmpty ? qty === 0 : qty <= 0)) {
      setError(
        stockModal.isEmpty
          ? 'La cantidad no puede ser 0'
          : 'La cantidad a dar de baja tiene que ser mayor a 0',
      )
      return
    }
    const delta = stockModal.isEmpty ? qty : -Math.abs(qty)
    const reason = stockForm.reason.trim() || 'Ajuste manual'
    try {
      await products.adjustStock(stockModal.product.id, delta, reason)
      closeStockModal()
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

  async function handleRemove(product) {
    if (
      !window.confirm(
        `¿Eliminar "${product.name}" definitivamente? Esta acción no se puede deshacer.`,
      )
    ) {
      return
    }
    try {
      await products.remove(product.id)
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function toggleExpanded(product) {
    if (expandedId === product.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(product.id)
    try {
      const expensesForProduct = await expenses.list(product.id)
      const flat = expensesForProduct.flatMap((exp) =>
        (exp.items || [])
          .filter((it) => it.product.id === product.id)
          .map((it) => ({
            id: it.id,
            date: exp.date,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            subtotal: it.subtotal,
          })),
      )
      setPurchases(flat)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {error && !stockModal && (
        <p className="bg-red-100 text-red-700 text-sm rounded px-3 py-2 mb-4 animate-fade-in-fast">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        noValidate
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

      <p className="text-xs text-slate-500 mb-3">
        Para sumar stock de garrafas llenas, cilindros o matafuegos, cargá un gasto vinculado al
        producto en la pestaña Gastos — así queda registrado a qué costo se compró. Acá solo se
        pueden registrar bajas (mermas, roturas, correcciones). Los envases <strong>vacíos</strong>{' '}
        son la excepción: su stock se puede ajustar libremente, sumando o restando, directamente
        desde acá. Una garrafa llena se vincula sola con su vacía correspondiente si tienen el
        mismo nombre (p. ej. "Garrafa 10kg llena" con "Garrafa 10kg vacía") — no hace falta
        elegirlo a mano.
      </p>

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
              <th className="px-4 py-2">Precio</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {TYPE_ORDER.filter((type) => list.some((p) => p.type === type)).map((type) => (
              <Fragment key={type}>
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-1.5 bg-brand-gray/40 text-xs font-semibold text-slate-600 uppercase tracking-wide"
                  >
                    {TYPE_LABELS[type]}
                  </td>
                </tr>
                {list
                  .filter((p) => p.type === type)
                  .map((p) => {
                    const isExpanded = expandedId === p.id
                    return (
                      <Fragment key={p.id}>
                  <tr
                    className={`border-t border-slate-100 transition-colors hover:bg-slate-50 ${!p.active ? 'text-slate-400' : ''}`}
                  >
                    <td className="px-4 py-2">
                      {p.name}
                      {!p.active && ' (baja)'}
                      {p.linkedEmptyProduct && (
                        <span className="block text-xs text-slate-400">
                          ↔ {p.linkedEmptyProduct.name}
                        </span>
                      )}
                      {p.type === 'gas_cylinder_full' && !p.linkedEmptyProduct && (
                        <span className="block text-xs text-amber-600">
                          Sin vacío vinculado (revisá que el nombre coincida)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">${Number(p.currentPrice).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-2">
                      {p.stock}
                      {p.linkedEmptyProduct && (
                        <span className="block text-xs text-slate-400">
                          {p.linkedEmptyProduct.stock} vacías
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => toggleExpanded(p)}
                        title={isExpanded ? 'Ocultar compras' : 'Ver compras'}
                        aria-label={isExpanded ? 'Ocultar compras' : 'Ver compras'}
                        className="text-slate-600 hover:text-brand-red transition-colors"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={() => startEdit(p)}
                        title="Editar"
                        aria-label="Editar"
                        className="text-slate-600 hover:text-brand-red transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => openStockModal(p)}
                        title={
                          p.type === 'gas_cylinder_empty'
                            ? 'Ajustar stock'
                            : 'Registrar merma o corrección'
                        }
                        aria-label={
                          p.type === 'gas_cylinder_empty'
                            ? 'Ajustar stock'
                            : 'Registrar merma o corrección'
                        }
                        className="text-slate-600 hover:text-brand-red transition-colors"
                      >
                        {p.type === 'gas_cylinder_empty' ? (
                          <SlidersHorizontal size={16} />
                        ) : (
                          <TrendingDown size={16} />
                        )}
                      </button>
                      {p.active ? (
                        <button
                          onClick={() => handleDeactivate(p.id)}
                          title="Dar de baja"
                          aria-label="Dar de baja"
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRemove(p)}
                          title="Eliminar definitivamente"
                          aria-label="Eliminar definitivamente"
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50 border-t border-slate-100">
                      <td colSpan={4} className="px-4 py-3">
                        <div className="animate-fade-in overflow-x-auto">
                          <p className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-2">
                            <History size={13} />
                            Historial de compras
                          </p>
                          <table className="w-full text-xs">
                            <thead className="text-slate-500 text-left">
                              <tr>
                                <th className="pr-4 py-1">Fecha</th>
                                <th className="pr-4 py-1">Cantidad</th>
                                <th className="pr-4 py-1">Costo unitario</th>
                                <th className="pr-4 py-1">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {purchases.map((purchase) => (
                                <tr key={purchase.id}>
                                  <td className="pr-4 py-1">
                                    {new Date(`${purchase.date}T00:00:00`).toLocaleDateString('es-AR')}
                                  </td>
                                  <td className="pr-4 py-1">{purchase.quantity}</td>
                                  <td className="pr-4 py-1">
                                    ${Number(purchase.unitPrice).toLocaleString('es-AR', {
                                      maximumFractionDigits: 2,
                                    })}
                                  </td>
                                  <td className="pr-4 py-1">
                                    ${Number(purchase.subtotal).toLocaleString('es-AR')}
                                  </td>
                                </tr>
                              ))}
                              {purchases.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="py-3 text-center text-slate-400">
                                    Sin compras registradas todavía.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                    </Fragment>
                  )
                })}
              </Fragment>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No hay productos cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-fade-in-fast">
          <form
            onSubmit={submitStockAdjust}
            noValidate
            className="bg-white shadow-2xl rounded-2xl p-5 w-full max-w-sm animate-pop"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-brand-black flex items-center gap-2">
                {stockModal.isEmpty ? (
                  <SlidersHorizontal size={17} className="text-brand-red" />
                ) : (
                  <TrendingDown size={17} className="text-brand-red" />
                )}
                {stockModal.isEmpty ? 'Ajustar stock' : 'Registrar merma o corrección'}
              </h3>
              <button
                type="button"
                onClick={closeStockModal}
                aria-label="Cerrar"
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{stockModal.product.name}</p>

            {error && (
              <p className="bg-red-100 text-red-700 text-sm rounded px-3 py-2 mb-3 animate-fade-in-fast">
                {error}
              </p>
            )}

            <label className="block text-xs text-slate-500 mb-1">
              {stockModal.isEmpty ? 'Cantidad (negativo para restar)' : 'Cantidad a dar de baja'}
            </label>
            <input
              type="number"
              step="1"
              autoFocus
              value={stockForm.quantity}
              onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-3 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />

            <label className="block text-xs text-slate-500 mb-1">Motivo</label>
            <input
              value={stockForm.reason}
              onChange={(e) => setStockForm({ ...stockForm, reason: e.target.value })}
              placeholder={stockModal.isEmpty ? 'Ajuste manual' : 'Merma, rotura, corrección...'}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 mb-4 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={closeStockModal}
                className="text-sm text-slate-500 hover:text-slate-800 px-3 py-1.5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 bg-brand-red text-white rounded-lg px-4 py-1.5 hover:bg-brand-red-dark transition-all active:scale-95"
              >
                {stockModal.isEmpty ? <SlidersHorizontal size={15} /> : <TrendingDown size={15} />}
                Confirmar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Products
