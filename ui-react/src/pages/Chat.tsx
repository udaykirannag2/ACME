import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, User, Send, Trash2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamChat } from '../api/client'
import { clsx } from 'clsx'

interface Message { role: 'user' | 'assistant'; content: string }

// ── Persistence helpers ───────────────────────────────────────────────────────

function readStorage<T>(storage: Storage, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function usePersistedState<T>(storage: Storage, key: string, init: () => T) {
  const [value, setRaw] = useState<T>(() => readStorage(storage, key, init()))
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setRaw(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
      try { storage.setItem(key, JSON.stringify(next)) } catch { /* quota */ }
      return next
    })
  }, [storage, key])
  return [value, set] as const
}

const LS = localStorage
const SS = sessionStorage

const SUGGESTED = [
  'What was gross margin trend by quarter in FY2024?',
  'Give me a 4-quarter revenue forecast',
  'Top 5 variance drivers vs budget in FY2024?',
  'What if we cut R&D by 15%? Impact on margin?',
  'Which customers have invoices 60+ days overdue?',
  'What is NRR and how is ACME tracking?',
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-atlas-inkMute animate-bounce3"
          style={{ animationDelay: `${i * -0.15}s` }}
        />
      ))}
    </div>
  )
}

export default function Chat() {
  // messages  → localStorage  (survives navigation, refresh, tab reopen)
  // memoryId  → localStorage  (stable user identity for AgentCore Memory)
  // sessionId → sessionStorage (one Bedrock Agent session per browser tab)
  const [messages, setMessages] = usePersistedState<Message[]>(LS, 'acme.chat.messages', () => [])
  const [memoryId]  = usePersistedState<string>(LS, 'acme.chat.memoryId',  () => `user-${Math.random().toString(36).slice(2, 18)}`)
  const [sessionId] = usePersistedState<string>(SS, 'acme.chat.sessionId', () => `sess-${Math.random().toString(36).slice(2, 14)}`)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [searchParams] = useSearchParams()
  const preloadRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [input])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return
    const question = text.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setIsStreaming(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      let accumulated = ''
      for await (const chunk of streamChat(question, sessionId, memoryId)) {
        accumulated += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: accumulated }
          return updated
        })
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${String(err)}` }
        return updated
      })
    } finally {
      setIsStreaming(false)
    }
  }, [isStreaming, sessionId, memoryId])

  useEffect(() => {
    if (preloadRef.current) return
    const q = searchParams.get('q')
    if (q && !isStreaming) {
      preloadRef.current = true
      send(decodeURIComponent(q))
    }
  }, [searchParams, send])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <div className="flex flex-col h-full bg-atlas-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-atlas-rule flex-shrink-0">
        <div>
          <h1 className="text-[15px] font-semibold text-atlas-ink">AI Finance Analyst</h1>
          <p className="text-[12px] text-atlas-inkDim">Powered by Bedrock Agent · Claude Sonnet · AgentCore Memory</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([])
              // New session so Bedrock Agent starts fresh too
              SS.setItem('acme.chat.sessionId', `sess-${Math.random().toString(36).slice(2, 14)}`)
            }}
            className="flex items-center gap-1.5 text-[12px] text-atlas-inkDim hover:text-atlas-red transition-colors px-2 py-1 rounded"
          >
            <Trash2 size={13} />
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0b66e4, #6c4ad9)' }}
              >
                <Sparkles size={22} className="text-white" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-atlas-ink">Ask anything about ACME Finance</p>
                <p className="text-[13px] text-atlas-inkDim mt-1">
                  Revenue, margins, ARR, variance analysis, what-if scenarios
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTED.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-[12.5px] px-3 py-2.5 rounded-xl border border-atlas-rule bg-atlas-bg hover:border-atlas-brand hover:bg-atlas-brandSoft text-atlas-inkSoft hover:text-atlas-brand transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={clsx('flex gap-3 mb-5', msg.role === 'user' && 'flex-row-reverse')}>
                <div className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                  msg.role === 'user' ? 'bg-atlas-brand' : 'bg-atlas-bgSunken'
                )}>
                  {msg.role === 'user'
                    ? <User size={13} className="text-white" />
                    : <Bot size={13} className="text-atlas-inkDim" />
                  }
                </div>
                <div className={clsx(
                  'max-w-[72%] px-4 py-2.5 text-[13.5px] leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-atlas-brand text-white rounded-2xl rounded-tr-sm'
                    : 'bg-atlas-bgSunken text-atlas-ink rounded-2xl rounded-tl-sm'
                )}>
                  {msg.role === 'user' ? (
                    <p>{msg.content}</p>
                  ) : msg.content === '' && isStreaming && i === messages.length - 1 ? (
                    <TypingDots />
                  ) : (
                    <div className="prose prose-sm max-w-none prose-table:text-[12px]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input dock */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-atlas-rule">
        <div className={clsx(
          'flex items-end gap-2 rounded-2xl border bg-atlas-bg px-4 py-3 transition-all',
          'focus-within:ring-2 focus-within:ring-atlas-brand/20 focus-within:border-atlas-brand/40',
          'border-atlas-rule'
        )}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a finance question… (Shift+Enter for new line)"
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-transparent resize-none outline-none text-[13.5px] text-atlas-ink placeholder-atlas-inkMute min-h-[24px] max-h-[160px] leading-relaxed disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || isStreaming}
            className={clsx(
              'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
              input.trim() && !isStreaming
                ? 'bg-atlas-brand text-white hover:bg-atlas-brandDeep'
                : 'bg-atlas-rule text-atlas-inkMute cursor-not-allowed'
            )}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-[11px] text-atlas-inkMute mt-2 text-center">
          Bedrock Agent · Claude Sonnet 4.6 · AgentCore Memory active
        </p>
      </div>
    </div>
  )
}
