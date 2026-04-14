import { useState } from 'react'
import useHouseStore from '../store/houseStore.js'

export default function ApiKeyModal({ onClose }) {
  const { apiKey, setApiKey } = useHouseStore()
  const [draft, setDraft] = useState(apiKey || '')

  const handleSave = () => {
    if (!draft.trim()) return
    setApiKey(draft.trim())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to ArchAI</h2>
        <p className="text-gray-500 text-sm mb-6">
          Enter your Anthropic API key to get started. It's stored locally in your browser
          and sent securely through the local proxy — never exposed in client code.
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Anthropic API Key
        </label>
        <input
          type="password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
          placeholder="sk-ant-..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
        />

        <p className="text-xs text-gray-400 mb-6">
          Get a key at{' '}
          <span className="text-indigo-500 cursor-default">console.anthropic.com</span>
        </p>

        <button
          onClick={handleSave}
          disabled={!draft.trim()}
          className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg
                     hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-colors"
        >
          Save &amp; Continue
        </button>
      </div>
    </div>
  )
}
