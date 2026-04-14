import { create } from 'zustand'
import { makeHistoryHelpers } from './historyMiddleware.js'
import { applyConstraints } from '../lib/constraintSolver.js'

// ── Default house (60×80 ft, Modern, 1 story) ────────────────────────────────
// Edit this object directly to change the house model.
export const DEFAULT_HOUSE = {
  meta: { plotWidth: 60, plotDepth: 80, style: 'Victorian', interiorStyle: 'Traditional', stories: 1 },
  rooms: [
    { id: 'living',   type: 'living',   label: 'Living Room',    x: 2,  y: 2,  width: 22, depth: 16, floor: 0, windows: ['north', 'west'],        door: { wall: 'south', offset: 9 } },
    { id: 'dining',   type: 'dining',   label: 'Dining Room',    x: 24, y: 2,  width: 14, depth: 14, floor: 0, windows: ['north'],                door: { wall: 'south', offset: 4 } },
    { id: 'kitchen',  type: 'kitchen',  label: 'Kitchen',        x: 38, y: 2,  width: 20, depth: 14, floor: 0, windows: ['north', 'east'],        door: { wall: 'south', offset: 7 } },
    { id: 'hallway',  type: 'hallway',  label: 'Hallway',        x: 2,  y: 18, width: 56, depth: 6,  floor: 0, windows: [],                       door: { wall: 'north', offset: 24 } },
    { id: 'master',   type: 'bedroom',  label: 'Master Bedroom', x: 2,  y: 24, width: 20, depth: 18, floor: 0, windows: ['west', 'south'],        door: { wall: 'north', offset: 8 } },
    { id: 'mbath',    type: 'bathroom', label: 'Master Bath',    x: 2,  y: 42, width: 10, depth: 9,  floor: 0, windows: ['west'],                 door: { wall: 'north', offset: 3 } },
    { id: 'bed2',     type: 'bedroom',  label: 'Bedroom 2',      x: 22, y: 24, width: 18, depth: 18, floor: 0, windows: ['south'],                door: { wall: 'north', offset: 7 } },
    { id: 'bed3',     type: 'bedroom',  label: 'Bedroom 3',      x: 40, y: 24, width: 18, depth: 18, floor: 0, windows: ['east', 'south'],        door: { wall: 'north', offset: 7 } },
    { id: 'bath2',    type: 'bathroom', label: 'Bathroom',       x: 22, y: 42, width: 12, depth: 9,  floor: 0, windows: ['south'],                door: { wall: 'north', offset: 4 } },
  ],
  features: {
    pool: false, poolX: 18, poolY: 54, poolW: 24, poolD: 12,
    garage: false, garageX: 40, garageY: 52, garageW: 18, garageD: 22,
  },
}

let helpers = null

const useHouseStore = create((set, get) => {
  helpers = makeHistoryHelpers(set, get)

  const initial = applyConstraints(DEFAULT_HOUSE)

  return {
    // ── House state ──────────────────────────────────────────────────────────
    house: initial,
    selectedRoomId: null,

    // ── History ──────────────────────────────────────────────────────────────
    history: [initial],
    historyIndex: 0,

    // ── Chat (UI messages only — no AI) ──────────────────────────────────────
    chatMessages: [],

    // ── House actions ─────────────────────────────────────────────────────────
    setHouse: (house) => {
      const constrained = applyConstraints(house)
      helpers.pushSnapshot(constrained)
      set({ house: constrained })
    },

    /**
     * Apply a list of diff changes from the edit endpoint.
     * Each change: { action, roomId?, ...params }
     */
    applyChanges: (changes) => {
      const { house } = get()
      if (!house) return

      let rooms = house.rooms.map((r) => ({ ...r }))
      let meta = { ...house.meta }
      let features = { ...house.features }

      for (const change of changes) {
        switch (change.action) {
          case 'resize_room': {
            rooms = rooms.map((r) =>
              r.id === change.roomId
                ? {
                    ...r,
                    ...(change.width != null ? { width: change.width } : {}),
                    ...(change.depth != null ? { depth: change.depth } : {}),
                  }
                : r
            )
            break
          }
          case 'move_room': {
            rooms = rooms.map((r) =>
              r.id === change.roomId ? { ...r, x: change.x, y: change.y } : r
            )
            break
          }
          case 'add_window': {
            rooms = rooms.map((r) =>
              r.id === change.roomId && !r.windows.includes(change.wall)
                ? { ...r, windows: [...r.windows, change.wall] }
                : r
            )
            break
          }
          case 'remove_window': {
            rooms = rooms.map((r) =>
              r.id === change.roomId
                ? { ...r, windows: r.windows.filter((w) => w !== change.wall) }
                : r
            )
            break
          }
          case 'change_room_label': {
            rooms = rooms.map((r) =>
              r.id === change.roomId ? { ...r, label: change.label } : r
            )
            break
          }
          case 'add_room': {
            const newRoom = {
              id: `r${Date.now()}`,
              type: change.type,
              label: change.label,
              x: change.x,
              y: change.y,
              width: change.width,
              depth: change.depth,
              floor: change.floor ?? 0,
              windows: change.windows ?? [],
              door: change.door ?? { wall: 'south', offset: 1 },
            }
            rooms = [...rooms, newRoom]
            break
          }
          case 'remove_room': {
            rooms = rooms.filter((r) => r.id !== change.roomId)
            break
          }
          case 'rotate_house': {
            const { plotWidth, plotDepth } = meta
            const deg = change.degrees
            if (deg === 90 || deg === 270) {
              const rotate90cw = (r) => ({
                ...r,
                x: plotDepth - r.y - r.depth,
                y: r.x,
                width: r.depth,
                depth: r.width,
              })
              if (deg === 90) {
                rooms = rooms.map(rotate90cw)
                meta = { ...meta, plotWidth: plotDepth, plotDepth: plotWidth }
              } else {
                // 270 = three 90° CW rotations
                rooms = rooms.map(rotate90cw).map(rotate90cw).map(rotate90cw)
                meta = { ...meta, plotWidth: plotDepth, plotDepth: plotWidth }
              }
            } else if (deg === 180) {
              rooms = rooms.map((r) => ({
                ...r,
                x: plotWidth - r.x - r.width,
                y: plotDepth - r.y - r.depth,
              }))
            }
            break
          }
          case 'change_style': {
            meta = { ...meta, style: change.style }
            break
          }
          case 'move_pool': {
            features = { ...features, poolX: change.x, poolY: change.y }
            break
          }
          default:
            break
        }
      }

      const newHouse = { ...house, meta, rooms, features }
      const constrained = applyConstraints(newHouse)
      helpers.pushSnapshot(constrained)
      set({ house: constrained })
    },

    undo: () => {
      helpers.undo()
    },
    redo: () => {
      helpers.redo()
    },
    canUndo: () => helpers.canUndo(),
    canRedo: () => helpers.canRedo(),

    selectRoom: (id) => set({ selectedRoomId: id }),

    addChatMessage: (msg) =>
      set((state) => ({ chatMessages: [...state.chatMessages, msg] })),

    clearChat: () => set({ chatMessages: [] }),
  }
})

export default useHouseStore
