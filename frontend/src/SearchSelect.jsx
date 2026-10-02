import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

// Reemplazo de <select> que se puede buscar tipeando: filtra las opciones
// por lo escrito (sin importar mayúsculas ni tildes) y se maneja con
// teclado (flechas para moverse, Enter para elegir, Escape para cerrar).
// `options` es [{ value, label }]; `emptyLabel` es la opción "sin valor".

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

const MAX_VISIBLE = 50

function SearchSelect({ value, onChange, options, emptyLabel, placeholder = 'Buscar...' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef(null)
  const listRef = useRef(null)

  const selected = options.find((o) => String(o.value) === String(value))

  const all = [{ value: '', label: emptyLabel }, ...options]
  const filtered = query
    ? all.filter((o) => o.value !== '' && normalize(o.label).includes(normalize(query)))
    : all
  const visible = filtered.slice(0, MAX_VISIBLE)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' })
  }, [highlight])

  function choose(option) {
    onChange(String(option.value))
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setHighlight((h) => Math.min(h + 1, visible.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && visible[highlight]) {
        e.preventDefault()
        choose(visible[highlight])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div ref={containerRef} className="relative w-56">
      <input
        value={open ? query : selected?.label || ''}
        placeholder={open ? placeholder : emptyLabel}
        onFocus={() => {
          setOpen(true)
          setHighlight(0)
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onKeyDown={handleKeyDown}
        className="w-full border border-slate-300 rounded pl-2 pr-7 py-1 transition-shadow focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red"
      />
      {selected && !open ? (
        <button
          type="button"
          onClick={() => onChange('')}
          title="Quitar"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      ) : (
        <ChevronDown
          size={14}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      )}
      {open && (
        <ul
          ref={listRef}
          className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded shadow-lg text-sm"
        >
          {visible.map((o, i) => (
            <li
              key={o.value}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(o)
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`px-2 py-1.5 cursor-pointer ${
                i === highlight ? 'bg-brand-red/10 text-brand-red' : ''
              } ${o.value === '' ? 'text-slate-500 italic' : ''}`}
            >
              {o.label}
            </li>
          ))}
          {visible.length === 0 && (
            <li className="px-2 py-1.5 text-slate-400">Sin resultados para “{query}”</li>
          )}
          {filtered.length > MAX_VISIBLE && (
            <li className="px-2 py-1.5 text-xs text-slate-400">
              Hay más resultados, seguí escribiendo para acotar.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export default SearchSelect
