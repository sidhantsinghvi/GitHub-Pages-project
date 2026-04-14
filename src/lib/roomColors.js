/** Background fill colors for room types (used in 2D floor plan) */
export const ROOM_COLORS = {
  bedroom: '#93c5fd',    // blue-300
  bathroom: '#5eead4',   // teal-300
  kitchen: '#fdba74',    // orange-300
  living: '#86efac',     // green-300
  dining: '#a7f3d0',     // emerald-200
  garage: '#d1d5db',     // gray-300
  office: '#c4b5fd',     // violet-300
  gym: '#fca5a5',        // red-300
  hallway: '#e5e7eb',    // gray-200
  balcony: '#fed7aa',    // orange-200
  pool: '#7dd3fc',       // sky-300
}

/** Floor colors for 3D view (slightly darker than fill) */
export const FLOOR_COLORS = {
  bedroom: '#60a5fa',
  bathroom: '#2dd4bf',
  kitchen: '#fb923c',
  living: '#4ade80',
  dining: '#34d399',
  garage: '#9ca3af',
  office: '#a78bfa',
  gym: '#f87171',
  hallway: '#d1d5db',
  balcony: '#fbbf24',
  pool: '#38bdf8',
}

export function getRoomColor(type) {
  return ROOM_COLORS[type] ?? '#e5e7eb'
}

export function getFloorColor(type) {
  return FLOOR_COLORS[type] ?? '#d1d5db'
}

/** Human-readable room type labels */
export const ROOM_TYPE_LABELS = {
  bedroom: 'Bedroom',
  bathroom: 'Bathroom',
  kitchen: 'Kitchen',
  living: 'Living Room',
  dining: 'Dining Room',
  garage: 'Garage',
  office: 'Home Office',
  gym: 'Gym',
  hallway: 'Hallway',
  balcony: 'Balcony',
  pool: 'Pool Area',
}
