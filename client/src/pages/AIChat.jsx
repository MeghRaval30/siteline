import { useState, useEffect, useRef } from 'react';
import { Bot, Send, Trash2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';

const SUGGESTIONS = [
  'How many assets are in maintenance?',
  'Show overdue returns',
  'Which department has the most assets?',
  'List all critical maintenance requests',
  'Give me a summary of the IT department',
  'How many laptops are available?',
];

export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [expandedTraces, setExpandedTraces] = useState({});
  const messagesEndRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const data = await apiClient.post('/ai/chat', { message: msg, session_id: sessionId });
      if (data.session_id) setSessionId(data.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'No response', trace: data.trace || [], offline: data.offline }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}. Make sure Ollama is running.`, trace: [] }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    if (sessionId) apiClient.delete(`/ai/sessions/${sessionId}`).catch(() => {});
    setMessages([]);
    setSessionId(null);
    setExpandedTraces({});
  };

  const toggleTrace = (idx) => setExpandedTraces(prev => ({ ...prev, [idx]: !prev[idx] }));

  return (
    <div className="sl-chat">
      <div className="sl-flex sl-items-center sl-justify-between sl-mb-4">
        <div><h1 className="sl-page__title">AI Assistant</h1><p className="sl-page__subtitle">Ask anything about your assets, powered by Ollama</p></div>
        {messages.length > 0 && <button className="sl-btn sl-btn--ghost" onClick={clearChat}><Trash2 size={16} /> New Chat</button>}
      </div>

      <div className="sl-chat__messages">
        {messages.length === 0 ? (
          <div className="sl-chat__welcome">
            <div className="sl-chat__welcome-icon"><Sparkles size={28} /></div>
            <h2 className="sl-chat__welcome-title">SiteLine AI</h2>
            <p className="sl-chat__welcome-subtitle">I can query your asset database, find overdue returns, check maintenance status, and more. Ask me anything!</p>
            <div className="sl-chat__suggestions">
              {SUGGESTIONS.map(s => <button key={s} className="sl-chat__suggestion" onClick={() => sendMessage(s)}>{s}</button>)}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`sl-chat__message sl-chat__message--${msg.role === 'user' ? 'user' : 'ai'}`}>
              <div className="sl-chat__message-avatar">{msg.role === 'user' ? 'You' : 'AI'}</div>
              <div className="sl-chat__message-content">
                <div className="sl-chat__message-bubble" style={{whiteSpace: 'pre-wrap'}}>{msg.content}</div>
                {msg.trace && msg.trace.length > 0 && (
                  <div className="sl-chat__trace">
                    <button className="sl-chat__trace-toggle" onClick={() => toggleTrace(i)}>
                      {expandedTraces[i] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      Agent Reasoning ({msg.trace.length} tool call{msg.trace.length > 1 ? 's' : ''})
                    </button>
                    {expandedTraces[i] && (
                      <div className="sl-chat__trace-body">
                        {msg.trace.map((t, j) => (
                          <div key={j} className="sl-chat__trace-step">
                            <div><span className="sl-chat__trace-tool">→ {t.tool}</span>({Object.entries(t.arguments || {}).map(([k,v]) => `${k}="${v}"`).join(', ')})</div>
                            <div className="sl-chat__trace-result">{JSON.stringify(t.result, null, 2)?.slice(0, 500)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="sl-chat__message sl-chat__message--ai">
            <div className="sl-chat__message-avatar">AI</div>
            <div className="sl-chat__message-content">
              <div className="sl-chat__loading">
                <div className="sl-chat__loading-dots"><span /><span /><span /></div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="sl-chat__input-area">
        <div className="sl-chat__input-wrapper">
          <input className="sl-chat__input" placeholder="Ask about your assets..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} disabled={loading} id="ai-chat-input" />
          <button className="sl-chat__send" onClick={() => sendMessage()} disabled={!input.trim() || loading} id="ai-chat-send"><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
