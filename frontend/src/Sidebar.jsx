import { LogOut } from 'lucide-react'
import hbLogo from './assets/hb-logo.svg'

function Sidebar({ tabs, active, onSelect, onLogout }) {
  return (
    <aside className="hidden md:flex md:flex-col md:w-60 md:fixed md:inset-y-0 bg-brand-black text-white z-30">
      <div className="px-6 py-5 border-b border-white/10 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-gray flex items-center justify-center shrink-0">
          <img src={hbLogo} alt="HB Servicios" className="w-8 h-8 rounded-md" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight leading-tight">HB Servicios</h1>
          <p className="text-xs text-white/40">Sistema de gestión</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {Object.entries(tabs).map(([key, { label, Icon }]) => {
          const isActive = active === key
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.97] ${
                isActive
                  ? 'bg-brand-red text-white shadow-sm shadow-brand-red/30'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon
                size={18}
                strokeWidth={2}
                className={`transition-transform duration-150 ${
                  isActive ? '' : 'group-hover:translate-x-0.5'
                }`}
              />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-all duration-150 active:scale-[0.97]"
        >
          <LogOut size={18} strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
