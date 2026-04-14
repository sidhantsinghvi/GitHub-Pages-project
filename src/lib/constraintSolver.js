const MIN_SIZES = {
  bedroom: { area: 100, w: 10, d: 10 },
  bathroom: { area: 40, w: 5, d: 8 },
  kitchen: { area: 80, w: 8, d: 10 },
  living: { area: 150, w: 12, d: 12 },
  dining: { area: 60, w: 8, d: 8 },
  office: { area: 80, w: 8, d: 10 },
  gym: { area: 100, w: 10, d: 10 },
  hallway: { area: 20, w: 3, d: 6 },
  balcony: { area: 30, w: 5, d: 6 },
  pool: { area: 100, w: 10, d: 10 },
  garage: { area: 200, w: 10, d: 20 },
}

const WALL_CLEARANCE = 2 // ft from plot edge

/** Enforce minimum room size for known types */
function enforceMinSize(room) {
  const min = MIN_SIZES[room.type]
  if (!min) return room
  return {
    ...room,
    width: Math.max(room.width, min.w),
    depth: Math.max(room.depth, min.d),
  }
}

/** Clamp room so it stays within plot bounds */
function clampToBounds(room, plotWidth, plotDepth) {
  const maxX = plotWidth - WALL_CLEARANCE
  const maxY = plotDepth - WALL_CLEARANCE

  const width = Math.min(room.width, maxX - WALL_CLEARANCE)
  const depth = Math.min(room.depth, maxY - WALL_CLEARANCE)
  const x = Math.max(WALL_CLEARANCE, Math.min(room.x, maxX - width))
  const y = Math.max(WALL_CLEARANCE, Math.min(room.y, maxY - depth))

  return { ...room, x, y, width, depth }
}

/** Check if two rooms (same floor) overlap */
function overlaps(a, b) {
  if (a.floor !== b.floor) return false
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.depth &&
    a.y + a.depth > b.y
  )
}

/** Resolve overlaps by nudging rooms apart — simple iterative approach */
function resolveOverlaps(rooms, plotWidth, plotDepth, maxIter = 20) {
  let result = rooms.map((r) => ({ ...r }))

  for (let iter = 0; iter < maxIter; iter++) {
    let anyOverlap = false

    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i]
        const b = result[j]
        if (!overlaps(a, b)) continue
        anyOverlap = true

        // Penetration depths on each axis
        const overlapX = Math.min(
          a.x + a.width - b.x,
          b.x + b.width - a.x
        )
        const overlapY = Math.min(
          a.y + a.depth - b.y,
          b.y + b.depth - a.y
        )

        // Push apart along axis of least penetration
        if (overlapX < overlapY) {
          const half = overlapX / 2
          const aCenter = a.x + a.width / 2
          const bCenter = b.x + b.width / 2
          if (aCenter < bCenter) {
            result[i] = { ...a, x: a.x - half }
            result[j] = { ...b, x: b.x + half }
          } else {
            result[i] = { ...a, x: a.x + half }
            result[j] = { ...b, x: b.x - half }
          }
        } else {
          const half = overlapY / 2
          const aCenter = a.y + a.depth / 2
          const bCenter = b.y + b.depth / 2
          if (aCenter < bCenter) {
            result[i] = { ...a, y: a.y - half }
            result[j] = { ...b, y: b.y + half }
          } else {
            result[i] = { ...a, y: a.y + half }
            result[j] = { ...b, y: b.y - half }
          }
        }

        // Re-clamp after nudging
        result[i] = clampToBounds(result[i], plotWidth, plotDepth)
        result[j] = clampToBounds(result[j], plotWidth, plotDepth)
      }
    }

    if (!anyOverlap) break
  }

  return result
}

/**
 * Main entry point: validate and fix the entire house state.
 * Returns a new house object with constraints applied.
 */
export function applyConstraints(house) {
  if (!house) return house
  const { meta, rooms, features } = house
  const { plotWidth, plotDepth } = meta

  // 1. Enforce minimum sizes
  let fixed = rooms.map(enforceMinSize)

  // 2. Clamp to bounds
  fixed = fixed.map((r) => clampToBounds(r, plotWidth, plotDepth))

  // 3. Resolve overlaps
  fixed = resolveOverlaps(fixed, plotWidth, plotDepth)

  return { ...house, rooms: fixed }
}
