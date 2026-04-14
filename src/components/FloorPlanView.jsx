import { useRef, useEffect, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Text, Line, Arc, Group, Arrow } from 'react-konva'
import useHouseStore from '../store/houseStore.js'
import { getRoomColor } from '../lib/roomColors.js'

const DOOR_WIDTH = 3 // ft
const PADDING = 60   // px

function useContainerSize(ref) {
  const [size, setSize] = useState({ width: 800, height: 600 })
  useEffect(() => {
    if (!ref.current) return
    const update = () =>
      setSize({ width: ref.current.offsetWidth, height: ref.current.offsetHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return size
}

/** Draw a door arc symbol on a Konva Group */
function DoorSymbol({ room, scale, offsetX, offsetY }) {
  const { x, y, width, depth, door } = room
  if (!door) return null

  const sw = door.wall
  const off = Math.min(door.offset, sw === 'north' || sw === 'south' ? width - DOOR_WIDTH : depth - DOOR_WIDTH)
  const dw = DOOR_WIDTH * scale

  let hx, hy, arcRotation
  if (sw === 'north') {
    hx = offsetX + (x + off) * scale
    hy = offsetY + y * scale
    arcRotation = 0
  } else if (sw === 'south') {
    hx = offsetX + (x + off + DOOR_WIDTH) * scale
    hy = offsetY + (y + depth) * scale
    arcRotation = 180
  } else if (sw === 'west') {
    hx = offsetX + x * scale
    hy = offsetY + (y + off) * scale
    arcRotation = 270
  } else {
    // east
    hx = offsetX + (x + width) * scale
    hy = offsetY + (y + off + DOOR_WIDTH) * scale
    arcRotation = 90
  }

  return (
    <Group>
      <Arc
        x={hx}
        y={hy}
        innerRadius={0}
        outerRadius={dw}
        angle={90}
        rotation={arcRotation}
        fill="rgba(255,255,255,0.6)"
        stroke="#555"
        strokeWidth={1}
      />
    </Group>
  )
}

/** Draw window tick marks on a wall */
function WindowMarks({ room, wall, scale, offsetX, offsetY }) {
  const { x, y, width, depth } = room
  const tickCount = 3
  const tickLen = 4

  let marks = []
  if (wall === 'north' || wall === 'south') {
    const wy = wall === 'north' ? offsetY + y * scale : offsetY + (y + depth) * scale
    const segW = width * scale / (tickCount + 1)
    for (let i = 1; i <= tickCount; i++) {
      const wx = offsetX + x * scale + segW * i
      marks.push(
        <Line
          key={i}
          points={[wx, wy - tickLen, wx, wy + tickLen]}
          stroke="#3b82f6"
          strokeWidth={2}
        />
      )
    }
  } else {
    const wx = wall === 'west' ? offsetX + x * scale : offsetX + (x + width) * scale
    const segH = depth * scale / (tickCount + 1)
    for (let i = 1; i <= tickCount; i++) {
      const wy = offsetY + y * scale + segH * i
      marks.push(
        <Line
          key={i}
          points={[wx - tickLen, wy, wx + tickLen, wy]}
          stroke="#3b82f6"
          strokeWidth={2}
        />
      )
    }
  }
  return <>{marks}</>
}

export default function FloorPlanView() {
  const containerRef = useRef(null)
  const size = useContainerSize(containerRef)
  const house = useHouseStore((s) => s.house)
  const selectedRoomId = useHouseStore((s) => s.selectedRoomId)
  const selectRoom = useHouseStore((s) => s.selectRoom)

  const [activeFloor, setActiveFloor] = useState(0)

  if (!house) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Generate a house to see the floor plan
      </div>
    )
  }

  const { meta, rooms, features } = house
  const { plotWidth, plotDepth } = meta

  if (!size.width || !size.height) {
    return <div ref={containerRef} className="flex-1" />
  }

  const scaleX = (size.width - PADDING * 2) / plotWidth
  const scaleY = (size.height - PADDING * 2) / plotDepth
  const scale = Math.min(scaleX, scaleY)
  const offsetX = (size.width - plotWidth * scale) / 2
  const offsetY = (size.height - plotDepth * scale) / 2

  const floorRooms = rooms.filter((r) => r.floor === activeFloor)
  const hasFloor1 = rooms.some((r) => r.floor === 1)

  // North arrow dimensions
  const arrowX = offsetX + plotWidth * scale + 10
  const arrowBaseY = offsetY + 60

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Floor selector */}
      {hasFloor1 && (
        <div className="flex gap-2 px-4 py-2 border-b border-gray-100">
          {[0, 1].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFloor(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                activeFloor === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f === 0 ? 'Ground Floor' : '2nd Floor'}
            </button>
          ))}
        </div>
      )}

      <div ref={containerRef} className="flex-1 relative">
        <Stage width={size.width} height={size.height}>
          <Layer>
            {/* Plot background */}
            <Rect
              x={offsetX}
              y={offsetY}
              width={plotWidth * scale}
              height={plotDepth * scale}
              fill="#f9fafb"
              stroke="#9ca3af"
              strokeWidth={2}
              dash={[6, 4]}
            />

            {/* Pool (ground floor only) */}
            {activeFloor === 0 && features.pool && (
              <Rect
                x={offsetX + features.poolX * scale}
                y={offsetY + features.poolY * scale}
                width={features.poolW * scale}
                height={features.poolD * scale}
                fill="#7dd3fc"
                stroke="#0ea5e9"
                strokeWidth={1.5}
                cornerRadius={4}
              />
            )}

            {/* Rooms */}
            {floorRooms.map((room) => {
              const rx = offsetX + room.x * scale
              const ry = offsetY + room.y * scale
              const rw = room.width * scale
              const rd = room.depth * scale
              const isSelected = room.id === selectedRoomId
              const color = getRoomColor(room.type)

              return (
                <Group key={room.id} onClick={() => selectRoom(room.id)}>
                  <Rect
                    x={rx}
                    y={ry}
                    width={rw}
                    height={rd}
                    fill={color}
                    stroke={isSelected ? '#6366f1' : '#374151'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    opacity={0.85}
                  />
                  {/* Label */}
                  <Text
                    x={rx + 4}
                    y={ry + rd / 2 - 8}
                    width={rw - 8}
                    height={20}
                    text={room.label}
                    fontSize={Math.max(8, Math.min(12, rw / 7))}
                    fill="#1f2937"
                    align="center"
                    wrap="none"
                    ellipsis
                  />
                  {/* Dimension text */}
                  {rw > 50 && rd > 30 && (
                    <Text
                      x={rx + 4}
                      y={ry + rd / 2 + 4}
                      width={rw - 8}
                      text={`${room.width}×${room.depth}`}
                      fontSize={Math.max(7, Math.min(10, rw / 9))}
                      fill="#6b7280"
                      align="center"
                      wrap="none"
                    />
                  )}

                  {/* Windows */}
                  {(room.windows || []).map((wall) => (
                    <WindowMarks
                      key={wall}
                      room={room}
                      wall={wall}
                      scale={scale}
                      offsetX={offsetX}
                      offsetY={offsetY}
                    />
                  ))}

                  {/* Door */}
                  <DoorSymbol
                    room={room}
                    scale={scale}
                    offsetX={offsetX}
                    offsetY={offsetY}
                  />
                </Group>
              )

            })}

            {/* North arrow */}
            <Arrow
              points={[arrowX, arrowBaseY, arrowX, arrowBaseY - 30]}
              pointerLength={8}
              pointerWidth={8}
              fill="#374151"
              stroke="#374151"
              strokeWidth={2}
            />
            <Text x={arrowX - 5} y={arrowBaseY - 48} text="N" fontSize={12} fontStyle="bold" fill="#374151"/>

            {/* Scale bar */}
            {(() => {
              const barFt = 10
              const barPx = barFt * scale
              const bx = offsetX
              const by = offsetY + plotDepth * scale + 16
              return (
                <>
                  <Line points={[bx, by, bx + barPx, by]} stroke="#374151" strokeWidth={2}/>
                  <Line points={[bx, by - 4, bx, by + 4]} stroke="#374151" strokeWidth={2}/>
                  <Line points={[bx + barPx, by - 4, bx + barPx, by + 4]} stroke="#374151" strokeWidth={2}/>
                  <Text x={bx} y={by + 6} text={`${barFt} ft`} fontSize={10} fill="#374151"/>
                </>
              )
            })()}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}
