import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ClipboardList,
  FireExtinguisher,
  Percent,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
  X,
} from 'lucide-react'
import { errorMessage, products, reports } from './api'

function money(value) {
  return `$${Number(value).toLocaleString('es-AR')}`
}

function StatTile({ label, value, tone = 'slate', Icon }) {
  const toneClasses = {
    slate: 'text-slate-800',
    emerald: 'text-emerald-700',
    red: 'text-red-700',
  }
  return (
    <div className="bg-white shadow-sm rounded-lg p-4 flex items-start justify-between gap-2 transition-shadow hover:shadow-md">
      <div>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className={`text-xl font-semibold ${toneClasses[tone]}`}>{value}</p>
      </div>
      {Icon && <Icon size={18} className={`mt-0.5 ${toneClasses[tone]} opacity-70`} />}
    </div>
  )
}

function Reports() {
  const [error, setError] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [sales, setSales] = useState(null)
  const [balance, setBalance] = useState(null)

  const [productList, setProductList] = useState([])
  const [movementProductId, setMovementProductId] = useState('')
  const [movements, setMovements] = useState([])

  const [daysAhead, setDaysAhead] = useState('30')
  const [alerts, setAlerts] = useState([])

  async function loadSalesAndBalance() {
    setError('')
    try {
      const [salesData, balanceData] = await Promise.all([
        reports.sales(from, to),
        reports.balance(from, to),
      ])
      setSales(salesData)
      setBalance(balanceData)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function loadMovements() {
    try {
      setMovements(await reports.stockMovements(movementProductId, from, to))
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
    loadSalesAndBalance()
    loadMovements()
    products.list().then(setProductList).catch((err) => setError(errorMessage(err)))
  }, [from, to])

  useEffect(() => {
    loadMovements()
  }, [movementProductId])

  useEffect(() => {
    loadAlerts()
  }, [daysAhead])

  return (
    <div className="max-w-4xl mx-auto">
      {error && (
        <p className="bg-red-100 text-red-700 text-sm rounded px-3 py-2 mb-4 animate-fade-in-fast">
          {error}
        </p>
      )}

      <div className="bg-white shadow-sm rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
        </div>
        {(from || to) && (
          <button
            type="button"
            onClick={() => {
              setFrom('')
              setTo('')
            }}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-red pb-1.5 transition-colors"
          >
            <X size={14} />
            Limpiar filtro
          </button>
        )}
        <p className="text-xs text-slate-400 pb-1.5">
          Sin fechas se muestra todo el histórico. El filtro aplica a ventas, balance y
          movimientos de stock.
        </p>
      </div>

      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-3">
        <ShoppingBag size={18} className="text-brand-red" />
        Ventas
      </h2>
      {sales && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <StatTile label="Pedidos" value={sales.totalOrders} Icon={ClipboardList} />
            <StatTile
              label="Facturado"
              value={money(sales.totalRevenue)}
              tone="emerald"
              Icon={TrendingUp}
            />
            <StatTile label="Descuentos" value={money(sales.totalDiscount)} Icon={Percent} />
            <StatTile label="Envíos" value={money(sales.totalShipping)} Icon={Truck} />
          </div>
          <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Cantidad vendida</th>
                  <th className="px-4 py-2">Facturado</th>
                </tr>
              </thead>
              <tbody>
                {sales.byProduct.map((p) => (
                  <tr key={p.productId} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                    <td className="px-4 py-2">{p.productName}</td>
                    <td className="px-4 py-2">{p.quantitySold}</td>
                    <td className="px-4 py-2">{money(p.revenue)}</td>
                  </tr>
                ))}
                {sales.byProduct.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                      No hay ventas en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-3">
        <Wallet size={18} className="text-brand-red" />
        Balance ingresos/egresos
      </h2>
      {balance && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 animate-fade-in">
          <StatTile
            label="Ingresos (ventas)"
            value={money(balance.income)}
            tone="emerald"
            Icon={TrendingUp}
          />
          <StatTile
            label="Egresos (gastos)"
            value={money(balance.expenses)}
            tone="red"
            Icon={TrendingDown}
          />
          <StatTile
            label="Neto"
            value={money(balance.net)}
            tone={Number(balance.net) >= 0 ? 'emerald' : 'red'}
            Icon={Wallet}
          />
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <ArrowUpDown size={18} className="text-brand-red" />
          Movimientos de stock
        </h2>
        <select
          value={movementProductId}
          onChange={(e) => setMovementProductId(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
        >
          <option value="">Todos los productos</option>
          {productList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="bg-white shadow-sm rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Movimiento</th>
              <th className="px-4 py-2">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                <td className="px-4 py-2">
                  {new Date(m.createdAt).toLocaleString('es-AR')}
                </td>
                <td className="px-4 py-2">{m.product?.name}</td>
                <td className="px-4 py-2">
                  <span
                    className={`font-medium ${m.delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                  >
                    {m.delta >= 0 ? `+${m.delta}` : m.delta}
                  </span>
                </td>
                <td className="px-4 py-2">{m.reason}</td>
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No hay movimientos en este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <FireExtinguisher size={18} className="text-brand-red" />
          Vencimiento de matafuegos
        </h2>
        <label className="text-sm text-slate-600 flex items-center gap-2">
          Próximos
          <input
            type="number"
            min="1"
            value={daysAhead}
            onChange={(e) => setDaysAhead(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 w-20 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
          />
          días (incluye ya vencidos)
        </label>
      </div>
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Producto</th>
              <th className="px-4 py-2">Pedido</th>
              <th className="px-4 py-2">Vencimiento</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                <td className="px-4 py-2">{a.clientName}</td>
                <td className="px-4 py-2">
                  {a.productName} x{a.quantity}
                </td>
                <td className="px-4 py-2">
                  {a.orderNumber ? `#${a.orderNumber}` : 'Carga directa'}
                </td>
                <td className="px-4 py-2">
                  {new Date(a.expiresAt).toLocaleDateString('es-AR')}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center gap-1 ${a.expired ? 'text-red-700' : 'text-amber-700'}`}
                  >
                    {a.expired ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                    {a.expired ? 'Vencido' : 'Próximo a vencer'}
                  </span>
                </td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No hay matafuegos por vencer en este rango.
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

export default Reports
