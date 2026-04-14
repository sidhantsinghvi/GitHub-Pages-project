import { useState, useEffect } from 'react'
import useHouseStore from './store/houseStore.js'
import TopBar from './components/TopBar.jsx'
import InputPanel from './components/InputPanel.jsx'
import FloorPlanView from './components/FloorPlanView.jsx'
import ThreeDView from './components/ThreeDView.jsx'
import RoomListView from './components/RoomListView.jsx'

const TABS = [
  { id: 'floorplan', label: 'Floor Plan', icon: '📐' },
  { id: '3d',        label: '3D View',    icon: '🏠' },
  { id: 'rooms',     label: 'Room List',  icon: '📋' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('floorplan')
  const [inputCollapsed, setInputCollapsed] = useState(false)

  // Keyboard undo/redo
  useEffect(() => {
    const { undo, redo } = useHouseStore.getState()
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo() }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <TopBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <InputPanel collapsed={inputCollapsed} onCollapse={setInputCollapsed} />

        {/* Center — tab bar + content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-gray-200 bg-white shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg
                            border border-b-0 transition-colors ${
                              activeTab === tab.id
                                ? 'bg-white border-gray-200 text-indigo-600 -mb-px pb-[9px]'
                                : 'bg-gray-50 border-transparent text-gray-500 hover:text-gray-700'
                            }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'floorplan' && <FloorPlanView />}
            {activeTab === '3d'        && <ThreeDView />}
            {activeTab === 'rooms'     && <RoomListView />}
          </div>
        </main>
      </div>
    </div>
  )
}
