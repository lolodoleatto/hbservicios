import { Fragment, useEffect, useState } from 'react'
import {
  ChevronDown,
  ClipboardCheck,
  Clock,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Repeat,
  Save,
  Share2,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { clients, errorMessage, orders, products } from './api'
import { firstMissing } from './validation'
import { ListFilters, PAGE_SIZE, Pagination } from './ListControls'
import SearchSelect from './SearchSelect'

const EMPTY_ITEM = { productId: '', quantity: '1', withExchange: true, expiresAt: '' }
const EMPTY_LOAN = { productId: '', quantity: '1', notes: '' }

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function plusOneYearIso(date = new Date()) {
  const d = new Date(date)
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

function Orders() {
  const [list, setList] = useState([])
  const [filters, setFilters] = useState({ from: '', to: '', search: '' })
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [clientList, setClientList] = useState([])
  const [productList, setProductList] = useState([])
  const [error, setError] = useState('')
  const [offlineNotice, setOfflineNotice] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState([])
  const [syncMessage, setSyncMessage] = useState('')
  const [syncing, setSyncing] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [discount, setDiscount] = useState('0')
  const [shippingCost, setShippingCost] = useState('0')
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [includeLoan, setIncludeLoan] = useState(false)
  const [loan, setLoan] = useState({ ...EMPTY_LOAN })
  const [total, setTotal] = useState('0')
  const [totalTouched, setTotalTouched] = useState(false)

  async function load() {
    setError('')
    setOfflineNotice('')
    try {
      const result = await orders.list({ ...filters, page, pageSize: PAGE_SIZE })
      // Si se borró el último pedido de la página, volver a la anterior.
      if (result.data.length === 0 && page > 1) {
        setPage(page - 1)
        return
      }
      setList(result.data)
      setTotalCount(result.total)
    } catch (err) {
      if (err instanceof TypeError) {
        setOfflineNotice(
          'Sin conexión: no se puede ver el historial de pedidos, pero podés seguir cargando pedidos nuevos.',
        )
      } else {
        setError(err.message)
      }
    }
  }

  async function loadPending() {
    setPending(await orders.listPending())
  }

  async function handleSync() {
    setSyncing(true)
    setSyncMessage('')
    try {
      const result = await orders.syncPending()
      if (result.synced || result.failed) {
        setSyncMessage(
          `Sincronizados: ${result.synced}. ${result.failed ? `Rechazados: ${result.failed} (revisar).` : ''}`,
        )
      }
      await loadPending()
      // handleSync también corre desde el listener 'online' registrado al
      // montar, con los filtros de ese momento: forzamos la recarga vía
      // estado para que use los filtros/página actuales.
      setReloadKey((k) => k + 1)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    load()
  }, [filters, page, reloadKey])

  function changeFilters(next) {
    setFilters(next)
    setPage(1)
  }

  useEffect(() => {
    loadPending()
    clients.list().then(setClientList).catch((err) => setError(errorMessage(err)))
    products.list().then(setProductList).catch((err) => setError(errorMessage(err)))

    function handleOnline() {
      setIsOnline(true)
      handleSync()
    }
    function handleOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Total en vivo = suma de líneas - descuento + envío, salvo que el usuario
  // ya haya tocado el campo a mano (ahí dejamos de pisarlo).
  useEffect(() => {
    if (totalTouched) return
    const itemsTotal = items.reduce((sum, it) => {
      const product = productList.find((p) => String(p.id) === String(it.productId))
      if (!product) return sum
      return sum + Number(product.currentPrice) * (Number(it.quantity) || 0)
    }, 0)
    const computed = itemsTotal - (Number(discount) || 0) + (Number(shippingCost) || 0)
    setTotal(String(Math.max(computed, 0)))
  }, [items, discount, shippingCost, productList, totalTouched])

  function updateItem(index, field, value) {
    setItems(items.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }

  // Al destildar "Con canje" en un pedido nuevo con cliente, se precarga el
  // préstamo del envase con esa garrafa y esa cantidad (se puede destildar
  // si en realidad el cliente compró el envase).
  function toggleExchange(index, checked) {
    updateItem(index, 'withExchange', checked)
    if (!checked && clientId && !editingId && !includeLoan) {
      setIncludeLoan(true)
      setLoan({ ...EMPTY_LOAN, productId: items[index].productId, quantity: items[index].quantity })
    }
  }

  function updateItemProduct(index, productId) {
    const product = productList.find((p) => String(p.id) === String(productId))
    setItems(
      items.map((it, i) =>
        i === index
          ? {
              ...it,
              productId,
              expiresAt: product?.type === 'fire_extinguisher' ? plusOneYearIso() : '',
            }
          : it,
      ),
    )
  }

  function addItem() {
    setItems([...items, { ...EMPTY_ITEM }])
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index))
  }

  function resetForm() {
    setEditingId(null)
    setClientId('')
    setDate(todayIso())
    setDiscount('0')
    setShippingCost('0')
    setTotal('0')
    setTotalTouched(false)
    setItems([{ ...EMPTY_ITEM }])
    setIncludeLoan(false)
    setLoan({ ...EMPTY_LOAN })
  }

  function startEdit(order) {
    setError('')
    setEditingId(order.id)
    setClientId(order.client?.id ? String(order.client.id) : '')
    setDate(order.date || todayIso())
    setDiscount(order.discount)
    setShippingCost(order.shippingCost)
    setTotal(order.total)
    setTotalTouched(true)
    setItems(
      order.items.map((it) => ({
        productId: String(it.product.id),
        quantity: String(it.quantity),
        withExchange: it.withExchange !== false,
        expiresAt: it.expiresAt ? it.expiresAt.slice(0, 10) : '',
      })),
    )
    setIncludeLoan(false)
    setLoan({ ...EMPTY_LOAN })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    resetForm()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    for (const [i, it] of items.entries()) {
      const missing = firstMissing([
        [`Producto (línea ${i + 1})`, it.productId],
        [`Cantidad (línea ${i + 1})`, it.quantity],
      ])
      if (missing) {
        setError(missing)
        return
      }
    }
    if (includeLoan && canLoan) {
      const missing = firstMissing([
        ['Producto prestado', loan.productId],
        ['Cantidad del préstamo', loan.quantity],
      ])
      if (missing) {
        setError(missing)
        return
      }
    }
    try {
      const payload = {
        clientId: clientId ? Number(clientId) : undefined,
        date: date || undefined,
        discount: Number(discount) || 0,
        shippingCost: Number(shippingCost) || 0,
        total: Number(total) || 0,
        items: items.map((it) => ({
          productId: Number(it.productId),
          quantity: Number(it.quantity),
          withExchange: it.withExchange !== false,
          expiresAt: it.expiresAt || undefined,
        })),
      }
      if (editingId) {
        await orders.update(editingId, payload)
        resetForm()
        load()
        products.list().then(setProductList)
        return
      }
      if (includeLoan && canLoan && loan.productId) {
        payload.loans = [
          {
            productId: Number(loan.productId),
            quantity: Number(loan.quantity),
            notes: loan.notes || undefined,
          },
        ]
      }
      const result = await orders.create(payload)
      resetForm()
      if (result?.pending) {
        setSyncMessage('Sin conexión: el pedido quedó guardado en el celular, pendiente de sincronizar.')
        loadPending()
      } else {
        load()
        products.list().then(setProductList)
      }
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleDelete(order) {
    if (
      !window.confirm(
        `¿Eliminar el pedido #${order.orderNumber}? Esto revierte el stock que había movido (y el canje, si aplicaba). No se puede deshacer.`,
      )
    ) {
      return
    }
    setError('')
    try {
      await orders.remove(order.id)
      if (editingId === order.id) resetForm()
      load()
      products.list().then(setProductList)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleDiscardPending(localId) {
    if (!window.confirm('¿Descartar este pedido pendiente? No se va a enviar al servidor.')) {
      return
    }
    await orders.discardPending(localId)
    loadPending()
  }

  async function handleDownloadPdf(order) {
    setError('')
    try {
      const blob = await orders.downloadPdf(order.id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleSharePdf(order) {
    setError('')
    try {
      const blob = await orders.downloadPdf(order.id)
      const file = new File([blob], `remito-${order.orderNumber}.pdf`, {
        type: 'application/pdf',
      })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Remito #${order.orderNumber}`,
        })
      } else {
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        window.open(
          `https://wa.me/?text=${encodeURIComponent(
            `Remito #${order.orderNumber} de HB Servicios (adjuntá el PDF que se acaba de abrir/descargar)`,
          )}`,
          '_blank',
        )
      }
    } catch (err) {
      if (err.name !== 'AbortError') setError(errorMessage(err))
    }
  }

  // Garrafas llenas vendidas SIN canje en este pedido, con la cantidad total
  // por producto: son las únicas que se pueden prestar (con canje el cliente
  // ya dejó su envase, no debe nada). Misma regla que valida el backend.
  const noExchangeQty = new Map()
  items.forEach((it) => {
    const product = productList.find((p) => String(p.id) === String(it.productId))
    if (product?.type !== 'gas_cylinder_full') return
    if (product.linkedEmptyProduct && it.withExchange !== false) return
    noExchangeQty.set(product.id, (noExchangeQty.get(product.id) || 0) + (Number(it.quantity) || 0))
  })
  const loanableProducts = productList.filter((p) => noExchangeQty.has(p.id))
  const maxLoanQty = noExchangeQty.get(Number(loan.productId)) || 0
  const canLoan = Boolean(clientId) && !editingId && loanableProducts.length > 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span
          className={`inline-flex items-center gap-2 text-sm ${
            isOnline ? 'text-emerald-700' : 'text-amber-700'
          }`}
        >
          {isOnline ? (
            <Wifi size={16} />
          ) : (
            <WifiOff size={16} className="animate-pulse" />
          )}
          {isOnline ? 'En línea' : 'Sin conexión'}
        </span>
        {pending.length > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing || !isOnline}
            className="inline-flex items-center gap-1.5 text-sm bg-brand-red text-white rounded px-3 py-1 hover:bg-brand-red-dark transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : `Sincronizar ahora (${pending.length})`}
          </button>
        )}
      </div>

      {error && (
        <p className="bg-red-100 text-red-700 text-sm rounded px-3 py-2 mb-4 animate-fade-in-fast">
          {error}
        </p>
      )}
      {offlineNotice && (
        <p className="bg-amber-100 text-amber-800 text-sm rounded px-3 py-2 mb-4 animate-fade-in-fast">
          {offlineNotice}
        </p>
      )}
      {syncMessage && (
        <p className="bg-slate-100 text-slate-700 text-sm rounded px-3 py-2 mb-4 animate-fade-in-fast">
          {syncMessage}
        </p>
      )}

      {pending.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6 animate-fade-in">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 text-sm font-semibold">
            <Clock size={14} />
            Pedidos pendientes de sincronizar
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-2">Cliente</th>
                <th className="px-4 py-2">Líneas</th>
                <th className="px-4 py-2">Creado (offline)</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.localId} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                  <td className="px-4 py-2">
                    {clientList.find((c) => c.id === p.payload.clientId)?.name ||
                      'Consumidor final'}
                  </td>
                  <td className="px-4 py-2">{p.payload.items.length}</td>
                  <td className="px-4 py-2">
                    {new Date(p.createdAt).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleDiscardPending(p.localId)}
                      title="Descartar"
                      aria-label="Descartar"
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="bg-white shadow-sm rounded-lg p-4 mb-6">
        {editingId && (
          <p className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 rounded px-3 py-1.5 mb-3">
            <Pencil size={13} />
            Editando el pedido — al guardar se recalcula el stock según los cambios.
          </p>
        )}
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cliente</label>
            <SearchSelect
              value={clientId}
              onChange={setClientId}
              options={clientList.map((c) => ({ value: c.id, label: c.name }))}
              emptyLabel="Consumidor final"
              placeholder="Escribí para buscar un cliente..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Descuento</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 w-28 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Costo de envío</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 w-28 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
            />
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3 items-end animate-fade-in-fast">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Producto</label>
                <select
                  value={item.productId}
                  onChange={(e) => updateItemProduct(i, e.target.value)}
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
              {productList.find((p) => String(p.id) === String(item.productId))?.type ===
                'fire_extinguisher' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Vencimiento</label>
                  <input
                    type="date"
                    value={item.expiresAt || plusOneYearIso()}
                    onChange={(e) => updateItem(i, 'expiresAt', e.target.value)}
                    className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                  />
                </div>
              )}
              {productList.find((p) => String(p.id) === String(item.productId))
                ?.linkedEmptyProduct && (
                <label className="flex items-center gap-1.5 text-sm text-slate-600 pb-1.5">
                  <input
                    type="checkbox"
                    checked={item.withExchange !== false}
                    onChange={(e) => toggleExchange(i, e.target.checked)}
                  />
                  <Repeat size={14} />
                  Con canje
                </label>
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
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-red transition-colors mb-3"
        >
          <Plus size={15} />
          Agregar línea
        </button>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mb-3">
          <label className="text-sm text-slate-600">
            Total del pedido
            {!totalTouched && <span className="text-slate-400"> (sugerido)</span>}
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={total}
            onChange={(e) => {
              setTotal(e.target.value)
              setTotalTouched(e.target.value !== '')
            }}
            className="border border-slate-300 rounded px-2 py-1 w-32 text-right font-semibold text-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
        </div>

        <div className="border-t border-slate-100 pt-3 mb-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 mb-2">
            <input
              type="checkbox"
              checked={includeLoan && canLoan}
              onChange={(e) => {
                setIncludeLoan(e.target.checked)
                if (e.target.checked && !loanableProducts.some((p) => String(p.id) === loan.productId)) {
                  const first = loanableProducts[0]
                  setLoan({ ...EMPTY_LOAN, productId: String(first.id), quantity: String(noExchangeQty.get(first.id)) })
                }
              }}
              disabled={!canLoan}
            />
            Este pedido incluye préstamo de un envase
          </label>
          {!canLoan && (
            <p className="text-xs text-slate-400 mb-2">
              {editingId
                ? 'Los préstamos no se editan desde acá: se manejan en Clientes.'
                : !clientId
                  ? 'Seleccioná un cliente arriba para poder registrar un préstamo.'
                  : 'Para prestar el envase, destildá "Con canje" en la garrafa que se lleva sin dejar su vacío.'}
            </p>
          )}
          {includeLoan && canLoan && (
            <div className="flex flex-wrap gap-3 items-end animate-fade-in">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Producto prestado</label>
                <select
                  value={loan.productId}
                  onChange={(e) => setLoan({ ...loan, productId: e.target.value })}
                  required
                  className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                >
                  <option value="">Seleccionar...</option>
                  {loanableProducts.map((p) => (
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
                  max={maxLoanQty || undefined}
                  value={loan.quantity}
                  onChange={(e) => setLoan({ ...loan, quantity: e.target.value })}
                  required
                  className="border border-slate-300 rounded px-2 py-1 w-20 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notas</label>
                <input
                  value={loan.notes}
                  onChange={(e) => setLoan({ ...loan, notes: e.target.value })}
                  className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-brand-red text-white rounded px-4 py-1.5 hover:bg-brand-red-dark transition-all active:scale-95"
          >
            {editingId ? <Save size={15} /> : <ClipboardCheck size={15} />}
            {editingId ? 'Guardar cambios' : 'Registrar pedido'}
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
          searchPlaceholder="Cliente o número de pedido"
        />
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Remito</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Descuento</th>
              <th className="px-4 py-2">Envío</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => {
              const isExpanded = expandedId === o.id
              return (
                <Fragment key={o.id}>
                  <tr className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="px-4 py-2">#{o.orderNumber}</td>
                    <td className="px-4 py-2">
                      {o.date
                        ? new Date(`${o.date}T00:00:00`).toLocaleDateString('es-AR')
                        : '—'}
                    </td>
                    <td className="px-4 py-2">{o.client?.name || 'Consumidor final'}</td>
                    <td className="px-4 py-2">
                      ${Number(o.discount).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-2">
                      ${Number(o.shippingCost).toLocaleString('es-AR')}
                    </td>
                    <td className="px-4 py-2">${Number(o.total).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : o.id)}
                        title={isExpanded ? 'Ocultar' : 'Ver detalle'}
                        aria-label={isExpanded ? 'Ocultar' : 'Ver detalle'}
                        className="text-slate-600 hover:text-brand-red transition-colors"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(o)}
                        title="Descargar remito"
                        aria-label="Descargar remito"
                        className="text-slate-600 hover:text-brand-red transition-colors"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleSharePdf(o)}
                        title="Compartir por WhatsApp"
                        aria-label="Compartir por WhatsApp"
                        className="text-emerald-600 hover:text-emerald-800 transition-colors"
                      >
                        <Share2 size={16} />
                      </button>
                      <button
                        onClick={() => startEdit(o)}
                        title="Editar"
                        aria-label="Editar"
                        className="text-slate-600 hover:text-brand-red transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(o)}
                        title="Eliminar"
                        aria-label="Eliminar"
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50 border-t border-slate-100">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="animate-fade-in overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="text-slate-500 text-left">
                              <tr>
                                <th className="pr-4 py-1">Producto</th>
                                <th className="pr-4 py-1">Cantidad</th>
                                <th className="pr-4 py-1">Precio unit.</th>
                                <th className="pr-4 py-1">Subtotal</th>
                                <th className="pr-4 py-1">Vence</th>
                              </tr>
                            </thead>
                            <tbody>
                              {o.items.map((it) => (
                                <tr key={it.id}>
                                  <td className="pr-4 py-1">{it.product?.name}</td>
                                  <td className="pr-4 py-1">{it.quantity}</td>
                                  <td className="pr-4 py-1">
                                    ${Number(it.unitPrice).toLocaleString('es-AR')}
                                  </td>
                                  <td className="pr-4 py-1">
                                    ${Number(it.subtotal).toLocaleString('es-AR')}
                                  </td>
                                  <td className="pr-4 py-1">
                                    {it.expiresAt
                                      ? new Date(it.expiresAt).toLocaleDateString('es-AR')
                                      : '-'}
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
                    ? 'No hay pedidos que coincidan con el filtro.'
                    : 'No hay pedidos cargados todavía.'}
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

export default Orders
