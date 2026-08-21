import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { askAI } from '../lib/ai'
import { Plus, Send, Trash2, MessageSquare, Loader2, Bot, User } from 'lucide-react'
import type { ChatSession, ChatMessageRow } from '../types'

export default function Chat() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageRow[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('chat_sessions').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setSessions(data ?? []))
  }, [user])

  useEffect(() => {
    if (!activeId) { setMessages([]); return }
    supabase.from('chat_messages').select('*').eq('session_id', activeId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []))
  }, [activeId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy])

  const newSession = async () => {
    if (!user) return
    const { data } = await supabase.from('chat_sessions')
      .insert({ user_id: user.id, title: 'Percakapan baru' }).select().single()
    if (data) { setSessions(s => [data, ...s]); setActiveId(data.id) }
  }

  const deleteSession = async (id: string) => {
    await supabase.from('chat_sessions').delete().eq('id', id)
    setSessions(s => s.filter(x => x.id !== id))
    if (activeId === id) setActiveId(null)
  }

  const send = async () => {
    const text = input.trim()
    if (!text || busy || !user) return
    setInput(''); setBusy(true)
    try {
      let sessionId = activeId
      if (!sessionId) {
        const { data } = await supabase.from('chat_sessions')
          .insert({ user_id: user.id, title: text.slice(0, 40) }).select().single()
        if (!data) throw new Error('Gagal membuat sesi chat')
        sessionId = data.id
        setSessions(s => [data, ...s])
        setActiveId(sessionId)
      }

      const { data: userMsg } = await supabase.from('chat_messages')
        .insert({ session_id: sessionId, user_id: user.id, role: 'user', content: text })
        .select().single()
      if (userMsg) setMessages(m => [...m, userMsg])

      const history = messages.map(m => ({ role: m.role, content: m.content }))
      const reply = await askAI(user.id, [...history, { role: 'user', content: text }])

      const { data: aiMsg } = await supabase.from('chat_messages')
        .insert({ session_id: sessionId, user_id: user.id, role: 'assistant', content: reply })
        .select().single()
      if (aiMsg) setMessages(m => [...m, aiMsg])
    } catch (err: any) {
      setMessages(m => [...m, {
        id: crypto.randomUUID(), session_id: '', user_id: '',
        role: 'assistant', content: `⚠️ ${err.message}`, created_at: new Date().toISOString(),
      }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full">
      {/* Daftar sesi */}
      <div className="flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/30">
        <div className="p-3">
          <button
            onClick={newSession}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" /> Chat Baru
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {sessions.map(s => (
            <div
              key={s.id}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                activeId === s.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/60'
              }`}
              onClick={() => setActiveId(s.id)}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{s.title}</span>
              <button
                onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                className="hidden text-slate-500 hover:text-red-400 group-hover:block"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Area chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.length === 0 && !busy && (
            <div className="flex h-full flex-col items-center justify-center text-slate-600">
              <Bot className="mb-3 h-12 w-12" />
              <p className="text-sm">Mulai percakapan dengan AI kamu.</p>
              <p className="text-xs">Jawaban AI dipengaruhi oleh persona & pengetahuan di dashboard ini.</p>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600/20">
                  <Bot className="h-4 w-4 text-indigo-400" />
                </div>
              )}
              <div
                className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700">
                  <User className="h-4 w-4 text-slate-300" />
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> AI sedang berpikir...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-end gap-2 rounded-xl border border-slate-700 bg-slate-900 p-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
              rows={2}
              placeholder="Tulis pesan... (Enter untuk kirim, Shift+Enter baris baru)"
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-slate-600"
            />
            <button
              onClick={send} disabled={busy || !input.trim()}
              className="rounded-lg bg-indigo-600 p-2.5 text-white transition hover:bg-indigo-500 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
