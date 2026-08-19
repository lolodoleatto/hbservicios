function BottomNav({ tabs, active, onSelect }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-brand-gray flex items-stretch z-40 pb-[env(safe-area-inset-bottom)]">
      {Object.entries(tabs).map(([key, { label, Icon }]) => {
        const isActive = active === key
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            aria-label={label}
            className={`relative flex-1 flex flex-col items-center justify-center py-2.5 transition-colors duration-150 active:scale-90 ${
              isActive ? 'text-brand-red' : 'text-brand-black/40'
            }`}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.25 : 2}
              className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}
            />
            <span
              className={`absolute bottom-1 h-1 w-1 rounded-full bg-brand-red transition-opacity duration-200 ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </button>
        )
      })}
    </nav>
  )
}

export default BottomNav
