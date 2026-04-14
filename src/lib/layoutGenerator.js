/**
 * Algorithmic house layout generator — no AI required.
 * Produces a deterministic room layout from form inputs.
 */

const WALL = 2 // clearance from plot edge

function uid(prefix) {
  return `${prefix}${Math.random().toString(36).slice(2, 7)}`
}

export function generateLayout(form) {
  const W = form.plotWidth
  const D = form.plotDepth
  const usableW = W - WALL * 2
  const usableD = D - WALL * 2
  const stories = Number(form.stories)
  const bedrooms = Number(form.bedrooms)
  const bathrooms = Number(form.bathrooms)
  const hasPool = form.pool
  const hasGarage = form.garage !== 'none'
  const garageW = form.garage === '2-car' ? 20 : 12
  const garageD = 22
  const style = form.style
  const interiorStyle = form.interiorStyle

  const rooms = []
  let features = {
    pool: false, poolX: 0, poolY: 0, poolW: 0, poolD: 0,
    garage: false, garageX: 0, garageY: 0, garageW: 0, garageD: 0,
  }

  // ── Zone the plot ───────────────────────────────────────────────────────────
  // Front zone (y: 0..~30%): public rooms (living, kitchen, dining)
  // Mid zone (y: ~30%..~60%): hallway + bathrooms
  // Back zone (y: ~60%..100%): bedrooms, pool

  const frontH = Math.round(usableD * 0.32)
  const midH   = Math.round(usableD * 0.10)
  const backH  = usableD - frontH - midH

  const yFront  = WALL
  const yMid    = yFront + frontH
  const yBack   = yMid + midH

  // ── Front zone — public rooms ───────────────────────────────────────────────
  const publicRooms = ['living']
  if (bedrooms >= 2) publicRooms.push('dining')
  publicRooms.push('kitchen')

  const segW = Math.floor(usableW / publicRooms.length)

  const publicWindowWalls = (idx, total) => {
    const walls = ['north']
    if (idx === 0) walls.push('west')
    if (idx === total - 1) walls.push('east')
    return walls
  }

  publicRooms.forEach((type, idx) => {
    const x = WALL + idx * segW
    const w = idx === publicRooms.length - 1 ? (usableW - idx * segW) : segW
    rooms.push({
      id: uid('r'),
      type,
      label: type === 'living' ? 'Living Room'
           : type === 'dining' ? 'Dining Room'
           : 'Kitchen',
      x,
      y: yFront,
      width: w,
      depth: frontH,
      floor: 0,
      windows: publicWindowWalls(idx, publicRooms.length),
      door: { wall: 'south', offset: Math.floor(w / 2) - 1 },
    })
  })

  // ── Hallway ─────────────────────────────────────────────────────────────────
  rooms.push({
    id: uid('r'),
    type: 'hallway',
    label: 'Hallway',
    x: WALL,
    y: yMid,
    width: usableW,
    depth: midH,
    floor: 0,
    windows: [],
    door: { wall: 'north', offset: Math.floor(usableW / 2) - 1 },
  })

  // ── Back zone — bedrooms + bathrooms (floor 0) ──────────────────────────────
  const bedsFloor0 = stories === 2 ? Math.ceil(bedrooms / 2) : bedrooms
  const bedsFloor1 = stories === 2 ? Math.floor(bedrooms / 2) : 0
  const bathsFloor0 = stories === 2 ? Math.ceil(bathrooms / 2) : bathrooms

  const backSlots = bedsFloor0 + bathsFloor0
  const slotW = Math.floor(usableW / backSlots)

  let slotIdx = 0

  // Bedrooms first
  for (let i = 0; i < bedsFloor0; i++) {
    const x = WALL + slotIdx * slotW
    const w = slotIdx === backSlots - 1 ? (usableW - slotIdx * slotW) : slotW
    const walls = ['south']
    if (slotIdx === 0) walls.push('west')
    if (slotIdx === backSlots - 1) walls.push('east')
    rooms.push({
      id: uid('r'),
      type: 'bedroom',
      label: i === 0 ? 'Master Bedroom' : `Bedroom ${i + 1}`,
      x,
      y: yBack,
      width: w,
      depth: backH,
      floor: 0,
      windows: walls,
      door: { wall: 'north', offset: Math.max(1, Math.floor(w / 2) - 1) },
    })
    slotIdx++
  }

  // Then bathrooms
  for (let i = 0; i < bathsFloor0; i++) {
    const x = WALL + slotIdx * slotW
    const w = slotIdx === backSlots - 1 ? (usableW - slotIdx * slotW) : slotW
    rooms.push({
      id: uid('r'),
      type: 'bathroom',
      label: i === 0 && bathrooms === 1 ? 'Bathroom' : `Bathroom ${i + 1}`,
      x,
      y: yBack,
      width: w,
      depth: Math.min(backH, 10),
      floor: 0,
      windows: ['south'],
      door: { wall: 'north', offset: Math.max(1, Math.floor(w / 2) - 1) },
    })
    slotIdx++
  }

  // ── Floor 1 bedrooms ────────────────────────────────────────────────────────
  if (stories === 2 && bedsFloor1 > 0) {
    const bathsFloor1 = bathrooms - bathsFloor0
    const f1Slots = bedsFloor1 + bathsFloor1
    const f1SlotW = Math.floor(usableW / f1Slots)
    let f1Idx = 0

    for (let i = 0; i < bedsFloor1; i++) {
      const x = WALL + f1Idx * f1SlotW
      const w = f1Idx === f1Slots - 1 ? (usableW - f1Idx * f1SlotW) : f1SlotW
      rooms.push({
        id: uid('r'),
        type: 'bedroom',
        label: `Bedroom ${bedsFloor0 + i + 1}`,
        x,
        y: yFront,
        width: w,
        depth: frontH + midH + backH,
        floor: 1,
        windows: ['south', f1Idx === 0 ? 'west' : 'east'],
        door: { wall: 'north', offset: Math.max(1, Math.floor(w / 2) - 1) },
      })
      f1Idx++
    }

    for (let i = 0; i < bathsFloor1; i++) {
      const x = WALL + f1Idx * f1SlotW
      const w = f1Idx === f1Slots - 1 ? (usableW - f1Idx * f1SlotW) : f1SlotW
      rooms.push({
        id: uid('r'),
        type: 'bathroom',
        label: `Bathroom ${bathsFloor0 + i + 1}`,
        x,
        y: yFront,
        width: w,
        depth: 10,
        floor: 1,
        windows: [],
        door: { wall: 'south', offset: Math.max(1, Math.floor(w / 2) - 1) },
      })
      f1Idx++
    }
  }

  // ── Special features ────────────────────────────────────────────────────────
  if (form.specialFeatures?.includes('home office')) {
    rooms.push({
      id: uid('r'),
      type: 'office',
      label: 'Home Office',
      x: WALL,
      y: yBack + backH - 14,
      width: 14,
      depth: 12,
      floor: stories === 2 ? 1 : 0,
      windows: ['west'],
      door: { wall: 'east', offset: 4 },
    })
  }

  if (form.specialFeatures?.includes('gym')) {
    rooms.push({
      id: uid('r'),
      type: 'gym',
      label: 'Gym',
      x: W - WALL - 16,
      y: yBack + backH - 14,
      width: 14,
      depth: 12,
      floor: stories === 2 ? 1 : 0,
      windows: ['east'],
      door: { wall: 'west', offset: 4 },
    })
  }

  // ── Pool ────────────────────────────────────────────────────────────────────
  if (hasPool) {
    const pW = Math.min(24, usableW - 4)
    const pD = 12
    const pX = WALL + (usableW - pW) / 2
    const pY = D - WALL - pD
    features = { ...features, pool: true, poolX: pX, poolY: pY, poolW: pW, poolD: pD }
  }

  // ── Garage ──────────────────────────────────────────────────────────────────
  if (hasGarage) {
    const gX = form.garage === '2-car' ? W - WALL - garageW : WALL
    const gY = yFront
    features = {
      ...features,
      garage: true,
      garageX: gX, garageY: gY, garageW, garageD,
    }
  }

  return {
    meta: { plotWidth: W, plotDepth: D, style, interiorStyle, stories: Number(stories) },
    rooms,
    features,
  }
}
