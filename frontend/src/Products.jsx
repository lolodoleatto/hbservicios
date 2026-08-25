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
  linkedEmptyProductId: '',
}

function Products() {
  const [list, setList] = useState([])
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showInactive, setShowInactive] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [purchases, setPurchases] = useState([])

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
      linkedEmptyProductId: product.linkedEmptyProduct?.id ?? '',
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
      const linkedEmptyProductId =
        form.type === 'gas_cylinder_full' && form.linkedEmptyProductId
          ? Number(form.linkedEmptyProductId)
          : null
      if (editingId) {
        await products.update(editingId, {
          name: form.name,
          type: form.type,
          currentPrice: Number(form.currentPrice),
          active: form.active,
          linkedEmptyProductId,
        })
      } else {
        await products.create({
          name: form.name,
          type: form.type,
          currentPrice: Number(form.currentPrice),
          stock: form.stock === '' ? 0 : Number(form.stock),
          linkedEmptyProductId: linkedEmptyProductId ?? undefined,
        })
      }
      setEditingId(null)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleAdjustStock(product) {
    const isEmpty = product.type === 'gas_cylinder_empty'
    if (isEmpty) {
      const delta = window.prompt('¿Cuánto stock sumar o restar? (negativo para restar)')
      if (!delta || Number(delta) === 0) return
      const reason = window.prompt('Motivo del ajuste') || 'Ajuste manual'
      try {
        await products.adjustStock(product.id, Number(delta), reason)
        load()
      } catch (err) {
        setError(errorMessage(err))
      }
      return
    }

    const qty = window.prompt('¿Cuántas unidades dar de baja? (merma, rotura, corrección)')
    if (!qty || Number(qty) <= 0) return
    const reason = window.prompt('Motivo de la baja') || 'Ajuste manual'
    try {
      await products.adjustStock(product.id, -Math.abs(Number(qty)), reason)
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
        {form.type === 'gas_cylinder_full' && (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Vacío correspondiente</label>
            <select
              value={form.linkedEmptyProductId}
              onChange={(e) => setForm({ ...form, linkedEmptyProductId: e.target.value })}
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            >
              <option value="">Sin vincular</option>
              {list
                .filter((p) => p.type === 'gas_cylinder_empty')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        )}
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
        desde acá.
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
                        onClick={() => handleAdjustStock(p)}
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
    </div>
  )
}

export default Products
