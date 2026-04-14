export const MAX_HISTORY = 20

/**
 * Wraps a state-setter to automatically push snapshots into a history stack.
 * Returns { pushSnapshot, undo, redo, canUndo, canRedo } helpers that work
 * with a Zustand store that holds `{ history, historyIndex }`.
 */
export function makeHistoryHelpers(set, get) {
  const pushSnapshot = (house) => {
    const { history, historyIndex } = get()
    const trimmed = history.slice(0, historyIndex + 1)
    const next = [...trimmed, house].slice(-MAX_HISTORY)
    set({ history: next, historyIndex: next.length - 1 })
  }

  const undo = () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const idx = historyIndex - 1
    set({ house: history[idx], historyIndex: idx })
  }

  const redo = () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const idx = historyIndex + 1
    set({ house: history[idx], historyIndex: idx })
  }

  const canUndo = () => get().historyIndex > 0
  const canRedo = () => get().historyIndex < get().history.length - 1

  return { pushSnapshot, undo, redo, canUndo, canRedo }
}
