import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FireExtinguisher,
  Pencil,
  Plus,
  Repeat,
  Save,
  Share2,
  Trash2,
  X,
} from 'lucide-react'
import { clients, errorMessage, fireExtinguishers, products, reports } from './api'
import { firstMissing } from './validation'
import SearchSelect from './SearchSelect'
import { openPdf, sharePdf } from './pdf'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function plusOneYear(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().slice(0, 10)
}

const EMPTY_LINE = { productId: '', quantity: '1', unitPrice: '' }

// Clases completas (no armadas con template strings) para que Tailwind las
// detecte y las incluya en el CSS.
const TONES = {
  red: {
    item: 'text-red-800',
    date: 'text-red-600',
    button: 'text-red-700 hover:text-red-900',
  },
  amber: {
    item: 'text-amber-800',
    date: 'text-amber-600',
    button: 'text-amber-700 hover:text-amber-900',
  },
}

const inputClass =
  'border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red'

function FireExtinguishers() {
  const [list, setList] = useState([])
  const [clientList, setClientList] = useState([])
  const [productList, setProductList] = useState([])
  const [alerts, setAlerts] = useState([])
  const [daysAhead, setDaysAhead] = useState('30')
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [clientId, setClientId] = useState('')
  const [lines, setLines] = useState([{ ...EMPTY_LINE }])
  const [amount, setAmount] = useState('')
  const [amountTouched, setAmountTouched] = useState(false)
  const [notes, setNotes] = useState('')
  const [soldAt, setSoldAt] = useState(todayIso())
  const [expiresAt, setExpiresAt] = useState(plusOneYear(todayIso()))
  const [expiresAtTouched, setExpiresAtTouched] = useState(false)
  const formRef = useRef(null)

  async function load() {
    setError('')
    try {
      setList(await fireExtinguishers.list())
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function loadAlerts() {
    try {
      setAlerts(await reports.fireExtinguisherAlerts(daysAhead))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  useEffect(() => {
    load()
    clients.list().then(setClientList).catch((err) => setError(errorMessage(err)))
    products
      .list()
      .then((data) => setProductList(data.filter((p) => p.type === 'fire_extinguisher')))
      .catch((err) => setError(errorMessage(err)))
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [daysAhead])

  // Vencimiento sugerido = fecha de recarga + 1 año, salvo que el usuario ya
  // lo haya tocado a mano.
  useEffect(() => {
    if (expiresAtTouched) return
    setExpiresAt(plusOneYear(soldAt))
  }, [soldAt, expiresAtTouched])

  // Total sugerido = suma de las líneas con precio, salvo que el usuario ya
  // haya escrito un total a mano (vaciar el campo vuelve al cálculo).
  useEffect(() => {
    if (amountTouched) return
    const priced = lines.filter((l) => l.unitPrice !== '')
    const sum = priced.reduce(
      (acc, l) => acc + Number(l.unitPrice) * (Number(l.quantity) || 0),
      0,
    )
    setAmount(priced.length ? String(sum) : '')
  }, [lines, amountTouched])

  function updateLine(index, field, value) {
    setLines(lines.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  function resetForm() {
    setEditingId(null)
    setClientId('')
    setLines([{ ...EMPTY_LINE }])
    setAmount('')
    setAmountTouched(false)
    setNotes('')
    setSoldAt(todayIso())
    setExpiresAt(plusOneYear(todayIso()))
    setExpiresAtTouched(false)
  }

  function startEdit(fe) {
    setError('')
    setEditingId(fe.id)
    setClientId(String(fe.client.id))
    setLines(
      fe.items.map((item) => ({
        productId: String(item.product.id),
        quantity: String(item.quantity),
        unitPrice: item.unitPrice ?? '',
      })),
    )
    setAmount(fe.amount ?? '')
    setAmountTouched(fe.amount !== null)
    setNotes(fe.notes || '')
    setSoldAt(fe.soldAt)
    setExpiresAt(fe.expiresAt)
    setExpiresAtTouched(true)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const missing = firstMissing([
      ['Cliente', clientId],
      ...lines.flatMap((l, i) => [
        [`Matafuego (línea ${i + 1})`, l.productId],
        [`Cantidad (línea ${i + 1})`, l.quantity],
      ]),
      ['Fecha de recarga', soldAt],
      ['Nuevo vencimiento', expiresAt],
    ])
    if (missing) {
      setError(missing)
      return
    }
    try {
      const payload = {
        clientId: Number(clientId),
        items: lines.map((l) => ({
          productId: Number(l.productId),
          quantity: Number(l.quantity),
          unitPrice: l.unitPrice !== '' ? Number(l.unitPrice) : undefined,
        })),
        amount: amount !== '' ? Number(amount) : undefined,
        notes: notes || undefined,
        soldAt,
        expiresAt,
      }
      if (editingId) {
        await fireExtinguishers.update(editingId, payload)
      } else {
        await fireExtinguishers.create(payload)
      }
      resetForm()
      load()
      loadAlerts()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleDelete(fe) {
    if (!window.confirm('¿Eliminar esta recarga? No se puede deshacer.')) return
    setError('')
    try {
      await fireExtinguishers.remove(fe.id)
      if (editingId === fe.id) resetForm()
      load()
      loadAlerts()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleDownloadPdf(fe) {
    setError('')
    try {
      openPdf(await fireExtinguishers.downloadPdf(fe.id))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleSharePdf(fe) {
    setError('')
    try {
      await sharePdf(await fireExtinguishers.downloadPdf(fe.id), {
        filename: `recarga-${fe.id}.pdf`,
        title: `Comprobante de recarga #${fe.id}`,
      })
    } catch (err) {
      if (err.name !== 'AbortError') setError(errorMessage(err))
    }
  }

  // Precarga la recarga desde una alerta. Si el formulario ya tiene una
  // recarga nueva en curso para el mismo cliente, suma el matafuego como otra
  // línea (para recargar varios del mismo cliente en un solo comprobante).
  function startRecharge(alert) {
    if (!alert.clientId) return
    const line = {
      productId: String(alert.productId),
      quantity: String(alert.quantity || 1),
      unitPrice: '',
    }
    const sameClient = !editingId && clientId === String(alert.clientId)
    const hasLines = lines.some((l) => l.productId)
    if (sameClient && hasLines) {
      if (!lines.some((l) => l.productId === line.productId)) setLines([...lines, line])
    } else {
      setEditingId(null)
      setClientId(String(alert.clientId))
      setLines([line])
      setAmount('')
      setAmountTouched(false)
      setNotes('')
      setSoldAt(todayIso())
      setExpiresAtTouched(false)
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const expired = alerts.filter((a) => a.expired)
  const upcoming = alerts.filter((a) => !a.expired)

  function alertList(items, toneName) {
    const tone = TONES[toneName]
    return (
      <ul className="space-y-1.5">
        {items.map((a) => (
          <li key={a.id} className={`text-sm ${tone.item} flex items-center justify-between gap-2`}>
            <span className="truncate">
              {a.clientName} — {a.productName}
              {a.quantity > 1 && ` (×${a.quantity})`}
            </span>
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span className={`text-xs ${tone.date}`}>
                {new Date(a.expiresAt).toLocaleDateString('es-AR')}
              </span>
              <button
                type="button"
                onClick={() => startRecharge(a)}
                disabled={!a.clientId}
                title={
                  a.clientId
                    ? 'Recargar este matafuego'
                    : 'Sin cliente asociado (pedido a consumidor final), no se puede precargar'
                }
                className={`inline-flex items-center gap-1 text-xs font-medium ${tone.button} disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
              >
                <Repeat size={12} />
                Recargar
              </button>
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <p className="bg-red-100 text-red-700 text-sm rounded px-3 py-2 mb-4 animate-fade-in-fast">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <AlertTriangle size={18} className="text-brand-red" />
          Vencidos y próximos a vencer
        </h2>
        <label className="text-sm text-slate-600 flex items-center gap-2">
          Próximos
          <input
            type="number"
            min="1"
            value={daysAhead}
            onChange={(e) => setDaysAhead(e.target.value)}
            className={`${inputClass} w-16`}
          />
          días
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700 mb-2">
            <AlertTriangle size={15} />
            Vencidos ({expired.length})
          </p>
          {expired.length === 0 ? (
            <p className="text-sm text-red-700/60">Ninguno vencido, buen trabajo.</p>
          ) : (
            alertList(expired, 'red')
          )}
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 mb-2">
            <Clock size={15} />
            Próximos a vencer ({upcoming.length})
          </p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-amber-700/60">Nada por vencer en este rango.</p>
          ) : (
            alertList(upcoming, 'amber')
          )}
        </div>
      </div>

      <h2 ref={formRef} className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-3">
        <FireExtinguisher size={18} className="text-brand-red" />
        Recarga de matafuegos
      </h2>
      <form onSubmit={handleSubmit} noValidate className="bg-white shadow-sm rounded-lg p-4 mb-6">
        {editingId && (
          <p className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 rounded px-3 py-1.5 mb-3">
            <Pencil size={13} />
            Editando la recarga #{editingId}.
          </p>
        )}
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Cliente</label>
            <SearchSelect
              value={clientId}
              onChange={setClientId}
              options={clientList.map((c) => ({ value: c.id, label: c.name }))}
              emptyLabel="Seleccionar..."
              placeholder="Escribí para buscar un cliente..."
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fecha de recarga</label>
            <input
              type="date"
              value={soldAt}
              onChange={(e) => setSoldAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Nuevo vencimiento
              {!expiresAtTouched && <span className="text-slate-400"> (sugerido)</span>}
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => {
                setExpiresAt(e.target.value)
                setExpiresAtTouched(true)
              }}
              className={inputClass}
            />
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-1">Matafuegos recargados</p>
        <div className="space-y-2 mb-2">
          {lines.map((line, i) => (
            <div key={i} className="flex flex-wrap gap-3 items-end">
              <div>
                {i === 0 && <label className="block text-xs text-slate-500 mb-1">Tipo</label>}
                <select
                  value={line.productId}
                  onChange={(e) => updateLine(i, 'productId', e.target.value)}
                  className={inputClass}
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
                {i === 0 && <label className="block text-xs text-slate-500 mb-1">Cantidad</label>}
                <input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                  className={`${inputClass} w-20`}
                />
              </div>
              <div>
                {i === 0 && (
                  <label className="block text-xs text-slate-500 mb-1">Precio de recarga c/u</label>
                )}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(i, 'unitPrice', e.target.value)}
                  placeholder="0"
                  className={`${inputClass} w-32`}
                />
              </div>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
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
          onClick={() => setLines([...lines, { ...EMPTY_LINE }])}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-red transition-colors mb-4"
        >
          <Plus size={15} />
          Agregar otro tipo de matafuego
        </button>

        <div className="flex flex-wrap gap-3 items-end border-t border-slate-100 pt-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 mb-1">Observaciones</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Total
              {!amountTouched && amount !== '' && <span className="text-slate-400"> (sugerido)</span>}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setAmountTouched(e.target.value !== '')
              }}
              placeholder="0"
              className={`${inputClass} w-32 text-right font-semibold`}
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-brand-red text-white rounded px-4 py-1.5 hover:bg-brand-red-dark transition-all active:scale-95"
          >
            {editingId ? <Save size={15} /> : <FireExtinguisher size={15} />}
            {editingId ? 'Guardar cambios' : 'Registrar recarga'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 pb-1.5 transition-colors"
            >
              <X size={15} />
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">N°</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Matafuegos</th>
              <th className="px-4 py-2">Fecha de recarga</th>
              <th className="px-4 py-2">Vencimiento</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((fe) => {
              const isExpired = new Date(`${fe.expiresAt}T00:00:00`) < new Date()
              return (
                <tr key={fe.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                  <td className="px-4 py-2">#{fe.id}</td>
                  <td className="px-4 py-2">{fe.client?.name}</td>
                  <td className="px-4 py-2">
                    {fe.items.map((item) => (
                      <div key={item.id} className="whitespace-nowrap">
                        {item.quantity} × {item.product?.name}
                      </div>
                    ))}
                  </td>
                  <td className="px-4 py-2">
                    {new Date(`${fe.soldAt}T00:00:00`).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-2">
                    {new Date(`${fe.expiresAt}T00:00:00`).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-4 py-2">
                    {fe.amount ? `$${Number(fe.amount).toLocaleString('es-AR')}` : '-'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex items-center gap-1 ${isExpired ? 'text-red-700' : 'text-emerald-700'}`}
                    >
                      {isExpired ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                      {isExpired ? 'Vencido' : 'Vigente'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                    <button
                      onClick={() => handleDownloadPdf(fe)}
                      title="Descargar comprobante"
                      aria-label="Descargar comprobante"
                      className="text-slate-600 hover:text-brand-red transition-colors"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleSharePdf(fe)}
                      title="Compartir por WhatsApp"
                      aria-label="Compartir por WhatsApp"
                      className="text-slate-600 hover:text-emerald-600 transition-colors"
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      onClick={() => startEdit(fe)}
                      title="Editar"
                      aria-label="Editar"
                      className="text-slate-600 hover:text-brand-red transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(fe)}
                      title="Eliminar"
                      aria-label="Eliminar"
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                  No hay recargas registradas todavía.
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

export default FireExtinguishers
