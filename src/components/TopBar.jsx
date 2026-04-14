import useHouseStore from '../store/houseStore.js'

const STYLE_COLORS = {
  Modern: 'bg-slate-700',
  Victorian: 'bg-rose-700',
  Mediterranean: 'bg-amber-600',
  Craftsman: 'bg-amber-800',
  Minimalist: 'bg-gray-600',
  Colonial: 'bg-blue-700',
  Industrial: 'bg-zinc-700',
}

export default function TopBar() {
  const house = useHouseStore((s) => s.house)
  const undo = useHouseStore((s) => s.undo)
  const redo = useHouseStore((s) => s.redo)
  const canUndo = useHouseStore((s) => s.canUndo())
  const canRedo = useHouseStore((s) => s.canRedo())

  const style = house?.meta?.style

  return (
    <header className="h-14 bg-gray-900 text-white flex items-center px-4 gap-4 shrink-0 z-10 shadow-lg">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <svg className="w-7 h-7 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <span className="text-lg font-bold tracking-tight">
          Arch<span className="text-indigo-400">AI</span>
        </span>
      </div>

      {/* Style badge */}
      {style && (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium text-white
                      ${STYLE_COLORS[style] ?? 'bg-gray-600'}`}
        >
          {style}
        </span>
      )}

      <div className="flex-1" />

      {/* Undo/redo */}
      {house && (
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30
                       disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 10h10a8 8 0 010 16H3m0-16l4-4m-4 4l4 4"/>
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30
                       disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 10H11a8 8 0 000 16h10m0-16l-4-4m4 4l-4 4"/>
            </svg>
          </button>
        </div>
      )}

      <span className="text-xs text-gray-500">Edit the code to customise</span>
    </header>
  )
}
