import { useState, useRef, useEffect } from 'react'
import useHouseStore from '../store/houseStore.js'
import { editHouse } from '../lib/claudeClient.js'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : msg.error
            ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
        }`}
      >
        {msg.content}
      </div>
    </div>
  )
}

export default function ChatPanel() {
  const house = useHouseStore((s) => s.house)
  const apiKey = useHouseStore((s) => s.apiKey)
  const chatMessages = useHouseStore((s) => s.chatMessages)
  const addChatMessage = useHouseStore((s) => s.addChatMessage)
  const applyChanges = useHouseStore((s) => s.applyChanges)

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading || !house) return

    setInput('')
    addChatMessage({ role: 'user', content: text })
    setLoading(true)

    try {
      const { changes, summary } = await editHouse(house, text, apiKey)
      applyChanges(changes)
      addChatMessage({
        role: 'assistant',
        content: summary || `Applied ${changes.length} change${changes.length !== 1 ? 's' : ''}.`,
      })
    } catch (e) {
      addChatMessage({ role: 'assistant', content: `Error: ${e.message}`, error: true })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <aside className="w-72 shrink-0 border-l border-gray-200 flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400"/>
        <span className="font-semibold text-sm text-gray-800">AI Chat</span>
        <span className="text-xs text-gray-400 ml-auto">claude-sonnet-4</span>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-3xl mb-3">💬</div>
            <p className="text-sm text-gray-500 font-medium">Describe a change</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              e.g. "make the kitchen bigger", "add a balcony", "rotate the house 90°"
            </p>
            <div className="mt-4 space-y-1.5 text-left w-full">
              {[
                'Add a south-facing window to the living room',
                'Move the garage to the east side',
                'Add a home office near the bedroom',
                'Change the style to Victorian',
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-50
                             hover:bg-indigo-50 hover:text-indigo-700 text-gray-600
                             border border-gray-100 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg, i) => (
              <Message key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex justify-start mb-3">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="px-3 py-3 border-t border-gray-100">
        {!house && (
          <p className="text-xs text-gray-400 text-center mb-2">
            Generate a house first
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={!house || loading}
            placeholder="Describe a change…"
            rows={2}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2
                       text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!house || loading || !input.trim()}
            className="shrink-0 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 text-white
                       rounded-xl flex items-center justify-center transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6"/>
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">Enter to send · Shift+Enter for newline</p>
      </div>
    </aside>
  )
}
