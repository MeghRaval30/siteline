import { useState, useRef, useEffect } from 'react'
import './App.css'

const API_BASE = 'http://localhost:8000'

const EXAMPLE_QUESTIONS = [
  { icon: '🔧', text: 'Which forklifts are currently under maintenance?' },
  { icon: '⚠️', text: 'Show me all overdue asset returns' },
  { icon: '🏭', text: 'Give me a summary of the Assembly department' },
  { icon: '📊', text: 'How many production-critical assets are available in Detroit?' },
  { icon: '🔍', text: 'Which department has the most overdue assets and who should I talk to about returning them?' },
  { icon: '📋', text: 'What are the open critical and high-priority maintenance requests and which plants are affected?' },
]

function TracePanel({ trace }) {
  const [isOpen, setIsOpen] = useState(false)

  if (!trace || trace.length === 0) return null

  return (
    <div className="trace-container">
      <button
        className={`trace-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="chevron">▶</span>
        Agent Reasoning — {trace.length} tool call{trace.length > 1 ? 's' : ''}
      </button>

      {isOpen && (
        <div className="trace-panel">
          {trace.map((step, i) => {
            const argsStr = Object.keys(step.arguments || {}).length > 0
              ? Object.entries(step.arguments)
                  .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                  .join(', ')
              : 'no arguments'

            const resultStr = typeof step.result === 'object'
              ? JSON.stringify(step.result, null, 2)
              : String(step.result)

            const resultPreview = resultStr.length > 600
              ? resultStr.slice(0, 600) + '\n... (truncated)'
              : resultStr

            return (
              <div key={i} className="trace-step">
                <div className="trace-step-header">
                  <span className="trace-step-number">{i + 1}</span>
                  <span className="trace-step-label">Called</span>
                  <span className="trace-step-tool">{step.tool}</span>
                </div>
                <div className="trace-step-args">
                  {step.tool}({argsStr})
                </div>
                <div className="trace-step-result-label">↳ Result:</div>
                <div className="trace-step-result">{resultPreview}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Message({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-bot'}`}>
      <div className="message-avatar">
        {isUser ? '👤' : '⚡'}
      </div>
      <div className="message-content">
        <div className="message-bubble">{message.content}</div>
        {!isUser && message.trace && <TracePanel trace={message.trace} />}
      </div>
    </div>
  )
}

function LoadingMessage() {
  return (
    <div className="message message-bot">
      <div className="message-avatar">⚡</div>
      <div className="message-content">
        <div className="message-bubble">
          <div className="loading-text">
            <div className="loading-dots">
              <span></span><span></span><span></span>
            </div>
            Analyzing your question and querying the database...
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dbSummary, setDbSummary] = useState(null)
  const chatRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    fetch(`${API_BASE}/db-summary`)
      .then(res => res.json())
      .then(data => setDbSummary(data.tables))
      .catch(err => console.error('Failed to fetch DB summary:', err))
  }, [])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages, loading])

  const sendMessage = async (text) => {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    setInput('')

    const userMsg = { role: 'user', content: messageText }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversation_history: [],
        }),
      })

      const data = await response.json()

      const botMsg = {
        role: 'assistant',
        content: data.answer,
        trace: data.trace,
      }
      setMessages(prev => [...prev, botMsg])
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: `Error: Could not reach the backend. Make sure the FastAPI server is running on port 8000.\n\n${err.message}`,
        trace: [],
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const totalRecords = dbSummary
    ? Object.values(dbSummary).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)
    : null

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">AF</div>
          <div>
            <div className="header-title">AssetFlow Agent</div>
            <div className="header-subtitle">AI-Powered Asset Intelligence</div>
          </div>
        </div>

        <div className="header-stats">
          {dbSummary && (
            <>
              <div className="stat-chip">
                <span className="stat-dot"></span>
                <span>Live DB</span>
                <span className="stat-value">{totalRecords} records</span>
              </div>
              <div className="stat-chip">
                <span>🏭</span>
                <span className="stat-value">{dbSummary.plants || 0}</span>
                <span>plants</span>
              </div>
              <div className="stat-chip">
                <span>⚙️</span>
                <span className="stat-value">{dbSummary.assets || 0}</span>
                <span>assets</span>
              </div>
              <div className="stat-chip">
                <span>👥</span>
                <span className="stat-value">{dbSummary.employees || 0}</span>
                <span>employees</span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Chat Area */}
      <div className="chat-area" ref={chatRef}>
        {messages.length === 0 && !loading ? (
          <div className="welcome">
            <div className="welcome-icon">⚡</div>
            <h2>AssetFlow Agent</h2>
            <p>
              Ask me anything about your manufacturing assets, maintenance,
              allocations, and bookings. I'll query the real database and show
              you exactly how I found the answer.
            </p>
            <div className="example-chips">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="example-chip"
                  onClick={() => sendMessage(q.text)}
                >
                  <span className="chip-icon">{q.icon}</span>
                  {q.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <Message key={i} message={msg} />
            ))}
            {loading && <LoadingMessage />}
          </>
        )}
      </div>

      {/* Input */}
      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            className="input-field"
            rows={1}
            placeholder="Ask about assets, maintenance, bookings, employees..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="send-button"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            title="Send message"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
