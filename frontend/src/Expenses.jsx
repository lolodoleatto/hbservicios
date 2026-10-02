import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, Pencil, Plus, Repeat, Save, Trash2, X } from 'lucide-react'
import { errorMessage, expenses, products, suppliers } from './api'
import { firstMissing } from './validation'
import { ListFilters, PAGE_SIZE, Pagination } from './ListControls'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY_FORM = {
  description: '',
  amount: '',
  category: '',
  date: todayIso(),
  supplierId: '',
}
const EMPTY_ITEM = { productId: '', quantity: '1', unitPrice: '' }
const CATEGORY_OPTIONS = [
  'Compra de stock',
  'Canje con proveedor',
  'Alquiler',
  'Sueldos',
  'Combustible',
  'Mantenimiento',
  'Impuestos',
  'Seguros',
  'Otros',
]

function Expenses() {
  const [list, setList] = useState([])
  const [filters, setFilters] = useState({ from: '', to: '', search: '' })
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [productList, setProductList] = useState([])
  const [supplierList, setSupplierList] = useState([])
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [amountTouched, setAmountTouched] = useState(false)
  const [isStockEntry, setIsStockEntry] = useState(false)
  const [isExchange, setIsExchange] = useState(false)
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [expandedId, setExpandedId] = useState(null)

  async function load() {
    setError('')
    try {
      const result = await expenses.list(undefined, { ...filters, page, pageSize: PAGE_SIZE })
      // Si se borró el último gasto de la página, volver a la anterior.
      if (result.data.length === 0 && page > 1) {
        setPage(page - 1)
        return
      }
      setList(result.data)
      setTotalCount(result.total)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    load()
  }, [filters, page])

  function changeFilters(next) {
    setFilters(next)
    setPage(1)
  }

  useEffect(() => {
    products.list().then(setProductList).catch((err) => setError(errorMessage(err)))
    suppliers.list().then(setSupplierList).catch((err) => setError(errorMessage(err)))
  }, [])

  // Sugiere el monto total como la suma de las líneas, salvo que el usuario
  // ya haya tocado el campo a mano (ahí dejamos de pisarlo).
  useEffect(() => {
    if (!isStockEntry || amountTouched) return
    const sum = items.reduce(
      (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
      0,
    )
    setForm((f) => ({ ...f, amount: sum > 0 ? String(sum) : '' }))
  }, [items, isStockEntry, amountTouched])

  function updateItem(index, field, value) {
    setItems(items.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }

  function addItem() {
    setItems([...items, { ...EMPTY_ITEM }])
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index))
  }

  function resetForm() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, date: form.date })
    setAmountTouched(false)
    setIsStockEntry(false)
    setIsExchange(false)
    setItems([{ ...EMPTY_ITEM }])
  }

  function startEdit(expense) {
    setError('')
    setEditingId(expense.id)
    setForm({
      description: expense.description || '',
      amount: expense.amount,
      category: expense.category || '',
      date: expense.date,
      supplierId: expense.supplier?.id ? String(expense.supplier.id) : '',
    })
    setAmountTouched(true)
    const hasItems = (expense.items || []).length > 0
    setIsStockEntry(hasItems)
    setIsExchange(Boolean(expense.isExchange))
    setItems(
      hasItems
        ? expense.items.map((it) => ({
            productId: String(it.product.id),
            quantity: String(it.quantity),
            unitPrice: String(it.unitPrice),
          }))
        : [{ ...EMPTY_ITEM }],
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    resetForm()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const missing = firstMissing([
      ['Categoría', form.category],
      ['Monto total', form.amount],
      ['Fecha', form.date],
    ])
    if (missing) {
      setError(missing)
      return
    }
    if (isStockEntry) {
      for (const [i, it] of items.entries()) {
        const itemMissing = firstMissing([
          [`Producto (línea ${i + 1})`, it.productId],
          [`Cantidad (línea ${i + 1})`, it.quantity],
          [`Precio unitario (línea ${i + 1})`, it.unitPrice],
        ])
        if (itemMissing) {
          setError(itemMissing)
          return
        }
      }
    }
    try {
      const payload = {
        category: form.category,
        description: form.description || undefined,
        amount: Number(form.amount),
        date: form.date,
        supplierId: form.supplierId ? Number(form.supplierId) : undefined,
      }
      if (isStockEntry) {
        payload.items = items.map((it) => ({
          productId: Number(it.productId),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        }))
        payload.isExchange = isExchange
      }
      if (editingId) {
        await expenses.update(editingId, payload)
      } else {
        await expenses.create(payload)
      }
      resetForm()
      load()
      products.list().then(setProductList)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleDelete(expense) {
    if (
      !window.confirm(
        `¿Eliminar este gasto? Esto revierte el stock que había movido (y el canje, si aplicaba). No se puede deshacer.`,
      )
    ) {
      return
    }
    setError('')
    try {
      await expenses.remove(expense.id)
      if (editingId === expense.id) resetForm()
      load()
      products.list().then(setProductList)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const emptyProductTotals = {}
  if (isExchange) {
    for (const it of items) {
      const product = productList.find((p) => String(p.id) === String(it.productId))
      const emptyName = product?.linkedEmptyProduct?.name
      if (!emptyName || !it.quantity) continue
      emptyProductTotals[emptyName] = (emptyProductTotals[emptyName] || 0) + Number(it.quantity)
    }
  }

  const availableProducts = isExchange
    ? productList.filter((p) => p.type === 'gas_cylinder_full' && p.linkedEmptyProduct)
    : productList

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <p className="bg-red-100 text-red-700 text-sm rounded px-3 py-2 mb-4 animate-fade-in-fast">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="bg-white shadow-sm rounded-lg p-4 mb-6">
        {editingId && (
          <p className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 rounded px-3 py-1.5 mb-3">
            <Pencil size={13} />
            Editando el gasto — al guardar se recalcula el stock según los cambios.
          </p>
        )}
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Categoría</label>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Alquiler, sueldos, combustible..."
              list="expense-categories"
              required
              autoFocus
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
            <datalist id="expense-categories">
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Proveedor</label>
            <select
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            >
              <option value="">Sin especificar</option>
              {supplierList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Monto total
              {isStockEntry && !amountTouched && (
                <span className="text-slate-400 font-normal"> (sugerido)</span>
              )}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => {
                setForm({ ...form, amount: e.target.value })
                setAmountTouched(e.target.value !== '')
              }}
              required
              className="border border-slate-300 rounded px-2 py-1 w-32 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
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

        <div className="mb-3">
          <label className="block text-xs text-slate-500 mb-1">
            Descripción <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Detalle adicional, si hace falta"
            className="border border-slate-300 rounded px-2 py-1 w-full transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
        </div>

        <div className="border-t border-slate-100 pt-3 mb-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 mb-2">
            <input
              type="checkbox"
              checked={isStockEntry}
              onChange={(e) => {
                setIsStockEntry(e.target.checked)
                setItems([{ ...EMPTY_ITEM }])
              }}
            />
            Este gasto es un ingreso de stock (p.ej. compra de garrafas)
          </label>

          {isStockEntry && (
            <div className="animate-fade-in">
              <label className="flex items-center gap-2 text-sm text-slate-700 mb-3">
                <input
                  type="checkbox"
                  checked={isExchange}
                  onChange={(e) => {
                    setIsExchange(e.target.checked)
                    setItems([{ ...EMPTY_ITEM }])
                  }}
                />
                Es un canje con el proveedor (le doy envases vacíos a cambio de llenas)
              </label>

              <div className="space-y-2 mb-2">
                {items.map((item, i) => {
                  const subtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
                  return (
                    <div key={i} className="flex flex-wrap gap-3 items-end animate-fade-in-fast">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">
                          {isExchange ? 'Garrafa llena que recibo' : 'Producto'}
                        </label>
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(i, 'productId', e.target.value)}
                          required
                          className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                        >
                          <option value="">Seleccionar...</option>
                          {availableProducts.map((p) => (
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
                          value={item.quantity}
                          onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                          required
                          className="border border-slate-300 rounded px-2 py-1 w-20 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Precio unitario</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                          required
                          className="border border-slate-300 rounded px-2 py-1 w-28 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                        />
                      </div>
                      {subtotal > 0 && (
                        <p className="text-xs text-slate-400 pb-1.5">
                          Subtotal: ${subtotal.toLocaleString('es-AR')}
                        </p>
                      )}
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 text-sm pb-1.5 transition-colors"
                        >
                          <X size={14} />
                          Quitar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-red transition-colors mb-2"
              >
                <Plus size={15} />
                Agregar producto
              </button>

              {isExchange && Object.keys(emptyProductTotals).length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1.5 inline-block">
                  Se van a descontar:{' '}
                  {Object.entries(emptyProductTotals)
                    .map(([name, qty]) => `${qty} de ${name}`)
                    .join(', ')}
                  .
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-brand-red text-white rounded px-4 py-1.5 hover:bg-brand-red-dark transition-all active:scale-95"
          >
            {editingId ? <Save size={15} /> : <Plus size={15} />}
            {editingId ? 'Guardar cambios' : 'Registrar gasto'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              <X size={15} />
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <ListFilters
          filters={filters}
          onChange={changeFilters}
          searchPlaceholder="Descripción, categoría o proveedor"
        />
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Categoría</th>
              <th className="px-4 py-2">Descripción</th>
              <th className="px-4 py-2">Proveedor</th>
              <th className="px-4 py-2">Ingreso de stock</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((exp) => {
              const expItems = exp.items || []
              const isExpanded = expandedId === exp.id
              return (
                <Fragment key={exp.id}>
                  <tr className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="px-4 py-2">
                      {new Date(exp.date).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
                    </td>
                    <td className="px-4 py-2">{exp.category || '-'}</td>
                    <td className="px-4 py-2">{exp.description || '-'}</td>
                    <td className="px-4 py-2">{exp.supplier?.name || '-'}</td>
                    <td className="px-4 py-2">
                      {expItems.length === 0 ? (
                        '-'
                      ) : expItems.length === 1 ? (
                        <span className="inline-flex items-center gap-1">
                          {exp.isExchange && <Repeat size={13} className="text-amber-600" />}
                          {expItems[0].product.name} (+{expItems[0].quantity})
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : exp.id)}
                          className="inline-flex items-center gap-1 text-slate-600 hover:text-brand-red transition-colors"
                        >
                          {exp.isExchange && <Repeat size={13} className="text-amber-600" />}
                          {expItems.length} productos
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2">${Number(exp.amount).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => startEdit(exp)}
                        title="Editar"
                        aria-label="Editar"
                        className="text-slate-600 hover:text-brand-red transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(exp)}
                        title="Eliminar"
                        aria-label="Eliminar"
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && expItems.length > 1 && (
                    <tr className="bg-slate-50 border-t border-slate-100">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="animate-fade-in overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="text-slate-500 text-left">
                              <tr>
                                <th className="pr-4 py-1">Producto</th>
                                <th className="pr-4 py-1">Cantidad</th>
                                <th className="pr-4 py-1">Precio unitario</th>
                                <th className="pr-4 py-1">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expItems.map((it) => (
                                <tr key={it.id}>
                                  <td className="pr-4 py-1">{it.product.name}</td>
                                  <td className="pr-4 py-1">{it.quantity}</td>
                                  <td className="pr-4 py-1">
                                    ${Number(it.unitPrice).toLocaleString('es-AR')}
                                  </td>
                                  <td className="pr-4 py-1">
                                    ${Number(it.subtotal).toLocaleString('es-AR')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  {filters.from || filters.to || filters.search
                    ? 'No hay gastos que coincidan con el filtro.'
                    : 'No hay gastos cargados todavía.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <Pagination page={page} total={totalCount} onChange={setPage} />
      </div>
    </div>
  )
}

export default Expenses
