import useHouseStore from '../store/houseStore.js'
import { getRoomColor } from '../lib/roomColors.js'

function fmt(n) {
  return Number.isFinite(n) ? n.toFixed(1) : '–'
}

export default function RoomListView() {
  const house = useHouseStore((s) => s.house)
  const selectedRoomId = useHouseStore((s) => s.selectedRoomId)
  const selectRoom = useHouseStore((s) => s.selectRoom)

  if (!house) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Generate a house to see the room list
      </div>
    )
  }

  const { meta, rooms, features } = house
  const { plotWidth, plotDepth } = meta

  const plotArea = plotWidth * plotDepth
  const totalRoomArea = rooms.reduce((sum, r) => sum + r.width * r.depth, 0)

  const byFloor = {
    0: rooms.filter((r) => r.floor === 0),
    1: rooms.filter((r) => r.floor === 1),
  }

  const TypeDot = ({ type }) => (
    <span
      className="inline-block w-3 h-3 rounded-full shrink-0"
      style={{ backgroundColor: getRoomColor(type) }}
    />
  )

  const FloorTable = ({ floor, floorRooms }) => (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {floor === 0 ? 'Ground Floor' : '2nd Floor'}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Room</th>
              <th className="px-3 py-2 text-right">W (ft)</th>
              <th className="px-3 py-2 text-right">D (ft)</th>
              <th className="px-3 py-2 text-right">Area (sqft)</th>
              <th className="px-3 py-2 text-left">Windows</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {floorRooms.map((r) => {
              const area = r.width * r.depth
              const isSelected = r.id === selectedRoomId
              return (
                <tr
                  key={r.id}
                  onClick={() => selectRoom(r.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <TypeDot type={r.type} />
                      <span className="font-medium text-gray-800">{r.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600 tabular-nums">{fmt(r.width)}</td>
                  <td className="px-3 py-2 text-right text-gray-600 tabular-nums">{fmt(r.depth)}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-800 tabular-nums">{fmt(area)}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {(r.windows || []).join(', ') || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  // Room type counts
  const typeCounts = rooms.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1
    return acc
  }, {})

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900">{rooms.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total rooms</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900">{fmt(totalRoomArea)}</div>
          <div className="text-xs text-gray-500 mt-0.5">Total area (sqft)</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900">
            {fmt((totalRoomArea / plotArea) * 100)}%
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Plot coverage</div>
        </div>
      </div>

      {/* Plot info */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6 text-sm">
        <div className="flex gap-4 flex-wrap">
          <span><span className="text-gray-500">Plot:</span> <strong>{plotWidth} × {plotDepth} ft</strong></span>
          <span><span className="text-gray-500">Plot area:</span> <strong>{plotArea} sqft</strong></span>
          <span><span className="text-gray-500">Style:</span> <strong>{meta.style}</strong></span>
          <span><span className="text-gray-500">Stories:</span> <strong>{meta.stories}</strong></span>
          {features.pool && <span className="text-sky-600 font-medium">🏊 Pool included</span>}
          {features.garage && <span className="text-gray-600 font-medium">🚗 Garage included</span>}
        </div>
      </div>

      {/* Room type breakdown */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(typeCounts).map(([type, count]) => (
          <span
            key={type}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                       border border-gray-200 bg-white text-gray-700"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getRoomColor(type) }}/>
            {count}× {type}
          </span>
        ))}
      </div>

      {/* Per-floor tables */}
      {byFloor[0].length > 0 && <FloorTable floor={0} floorRooms={byFloor[0]} />}
      {byFloor[1].length > 0 && <FloorTable floor={1} floorRooms={byFloor[1]} />}
    </div>
  )
}
