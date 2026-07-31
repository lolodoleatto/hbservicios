import { Fragment, useEffect, useState } from 'react'
import { clients, errorMessage, orders, products } from './api'

const EMPTY_ITEM = { productId: '', quantity: '1' }
const EMPTY_LOAN = { productId: '', quantity: '1', notes: '' }

function Orders() {
  const [list, setList] = useState([])
  const [clientList, setClientList] = useState([])
  const [productList, setProductList] = useState([])
  const [error, setError] = useState('')
  const [offlineNotice, setOfflineNotice] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState([])
  const [syncMessage, setSyncMessage] = useState('')
  const [syncing, setSyncing] = useState(false)

  const [clientId, setClientId] = useState('')
  const [discount, setDiscount] = useState('0')
  const [shippingCost, setShippingCost] = useState('0')
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [includeLoan, setIncludeLoan] = useState(false)
  const [loan, setLoan] = useState({ ...EMPTY_LOAN })

  async function load() {
    setError('')
    setOfflineNotice('')
    try {
      setList(await orders.list())
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
      load()
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    load()
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

  function updateItem(index, field, value) {
    setItems(items.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }

  function addItem() {
    setItems([...items, { ...EMPTY_ITEM }])
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        clientId: clientId ? Number(clientId) : undefined,
        discount: Number(discount) || 0,
        shippingCost: Number(shippingCost) || 0,
        items: items.map((it) => ({
          productId: Number(it.productId),
          quantity: Number(it.quantity),
        })),
      }
      if (includeLoan && clientId && loan.productId) {
        payload.loans = [
          {
            productId: Number(loan.productId),
            quantity: Number(loan.quantity),
            notes: loan.notes || undefined,
          },
        ]
      }
      const result = await orders.create(payload)
      setClientId('')
      setDiscount('0')
      setShippingCost('0')
      setItems([{ ...EMPTY_ITEM }])
      setIncludeLoan(false)
      setLoan({ ...EMPTY_LOAN })
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span
          className={`inline-flex items-center gap-2 text-sm ${
            isOnline ? 'text-emerald-700' : 'text-amber-700'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}
          />
          {isOnline ? 'En línea' : 'Sin conexión'}
        </span>
        {pending.length > 0 && (
          <button
            onClick={handleSync}
            disabled={syncing || !isOnline}
            className="text-sm bg-slate-800 text-white rounded px-3 py-1 hover:bg-slate-700 disabled:opacity-50"
          >
            {syncing ? 'Sincronizando...' : `Sincronizar ahora (${pending.length})`}
          </button>
        )}
      </div>

      {error && (
        <p className="bg-red-100 text-red-700 text-sm rounded px-3 py-2 mb-4">{error}</p>
      )}
      {offlineNotice && (
        <p className="bg-amber-100 text-amber-800 text-sm rounded px-3 py-2 mb-4">
          {offlineNotice}
        </p>
      )}
      {syncMessage && (
        <p className="bg-slate-100 text-slate-700 text-sm rounded px-3 py-2 mb-4">
          {syncMessage}
        </p>
      )}

      {pending.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-2 bg-amber-50 text-amber-800 text-sm font-semibold">
            Pedidos pendientes de sincronizar
          </div>
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
                <tr key={p.localId} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    {clientList.find((c) => c.id === p.payload.clientId)?.name ||
                      'Consumidor final'}
                  </td>
                  <td className="px-4 py-2">{p.payload.items.length}</td>
                  <td className="px-4 py-2">
                    {new Date(p.createdAt).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDiscardPending(p.localId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Descartar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cliente</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1"
            >
              <option value="">Consumidor final</option>
              {clientList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Descuento</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 w-28"
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
              className="border border-slate-300 rounded px-2 py-1 w-28"
            />
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {items.map((item, i) => (
            <div key={i} className="flex gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Producto</label>
                <select
                  value={item.productId}
                  onChange={(e) => updateItem(i, 'productId', e.target.value)}
                  required
                  className="border border-slate-300 rounded px-2 py-1"
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
                  className="border border-slate-300 rounded px-2 py-1 w-20"
                />
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-red-600 hover:text-red-800 text-sm pb-1"
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-3 mb-3">
          <label className="flex items-center gap-2 text-sm text-slate-700 mb-2">
            <input
              type="checkbox"
              checked={includeLoan}
              onChange={(e) => setIncludeLoan(e.target.checked)}
              disabled={!clientId}
            />
            Este pedido incluye préstamo de un envase
          </label>
          {!clientId && includeLoan === false && (
            <p className="text-xs text-slate-400 mb-2">
              Seleccioná un cliente arriba para poder registrar un préstamo.
            </p>
          )}
          {includeLoan && (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Producto prestado</label>
                <select
                  value={loan.productId}
                  onChange={(e) => setLoan({ ...loan, productId: e.target.value })}
                  required
                  className="border border-slate-300 rounded px-2 py-1"
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
                  value={loan.quantity}
                  onChange={(e) => setLoan({ ...loan, quantity: e.target.value })}
                  required
                  className="border border-slate-300 rounded px-2 py-1 w-20"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notas</label>
                <input
                  value={loan.notes}
                  onChange={(e) => setLoan({ ...loan, notes: e.target.value })}
                  className="border border-slate-300 rounded px-2 py-1"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={addItem}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            + Agregar línea
          </button>
          <button
            type="submit"
            className="bg-slate-800 text-white rounded px-4 py-1.5 hover:bg-slate-700"
          >
            Registrar pedido
          </button>
        </div>
      </form>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Remito</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Descuento</th>
              <th className="px-4 py-2">Envío</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <Fragment key={o.id}>
                <tr className="border-t border-slate-100">
                  <td className="px-4 py-2">#{o.orderNumber}</td>
                  <td className="px-4 py-2">{o.client?.name || 'Consumidor final'}</td>
                  <td className="px-4 py-2">
                    ${Number(o.discount).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-2">
                    ${Number(o.shippingCost).toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-2">${Number(o.total).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <button
                      onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      {expandedId === o.id ? 'Ocultar' : 'Ver detalle'}
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(o)}
                      className="text-slate-600 hover:text-slate-900"
                    >
                      Descargar remito
                    </button>
                    <button
                      onClick={() => handleSharePdf(o)}
                      className="text-emerald-600 hover:text-emerald-800"
                    >
                      Compartir por WhatsApp
                    </button>
                  </td>
                </tr>
                {expandedId === o.id && (
                  <tr className="bg-slate-50 border-t border-slate-100">
                    <td colSpan={6} className="px-4 py-3">
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
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No hay pedidos cargados todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Orders
