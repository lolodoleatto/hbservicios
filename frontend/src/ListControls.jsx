import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'

export const PAGE_SIZE = 20

const inputClass =
  'border border-slate-300 rounded px-2 py-1 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red'

// Barra de filtros de los listados: rango de fechas + búsqueda de texto.
// La búsqueda se manda recién cuando se deja de tipear (300 ms), para no
// pegarle al backend con cada tecla.
export function ListFilters({ filters, onChange, searchPlaceholder = 'Buscar...' }) {
  const [search, setSearch] = useState(filters.search)

  useEffect(() => {
    setSearch(filters.search)
  }, [filters.search])

  useEffect(() => {
    if (search === filters.search) return
    const timer = setTimeout(() => onChange({ ...filters, search }), 300)
    return () => clearTimeout(timer)
  }, [search])

  const hasFilters = filters.from || filters.to || filters.search

  return (
    <div className="flex flex-wrap gap-3 items-end px-4 py-3 border-b border-slate-100">
      <div className="flex-1 min-w-[180px]">
        <label className="block text-xs text-slate-500 mb-1">Buscar</label>
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className={`${inputClass} w-full pl-7`}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Desde</label>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Hasta</label>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
          className={inputClass}
        />
      </div>
      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange({ from: '', to: '', search: '' })}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 pb-1.5 transition-colors"
        >
          <X size={14} />
          Limpiar
        </button>
      )}
    </div>
  )
}

// Paginación al pie de una tabla. `total` es la cantidad de registros que
// cumplen el filtro (no sólo los de esta página).
export function Pagination({ page, pageSize = PAGE_SIZE, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  const first = (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  const buttonClass =
    'inline-flex items-center gap-1 px-2 py-1 rounded transition-colors enabled:hover:bg-slate-100 disabled:text-slate-300'

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t border-slate-100 text-sm text-slate-500">
      <span>
        {first}–{last} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className={buttonClass}
        >
          <ChevronLeft size={15} />
          Anterior
        </button>
        <span className="px-2">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className={buttonClass}
        >
          Siguiente
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}
