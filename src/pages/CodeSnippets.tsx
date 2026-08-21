import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Copy, Trash2, Check, Code2 } from 'lucide-react'
import type { Snippet } from '../types'

const LANGS = ['typescript', 'javascript', 'python', 'sql', 'html', 'css', 'json', 'bash', 'lainnya']

export default function CodeSnippets() {
  const { user } = useAuth()
  const [snippets, setSnippets] = useState<Snippet[]>([])
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('typescript')
  const [code, setCode] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('code_snippets').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setSnippets(data ?? []))
  }, [user])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim() || !code.trim()) return
    const { data } = await supabase.from('code_snippets')
      .insert({ user_id: user.id, title: title.trim(), language, code })
      .select().single()
    if (data) {
      setSnippets(s => [data, ...s])
      setTitle(''); setCode('')
    }
  }

  const remove = async (id: string) => {
    await supabase.from('code_snippets').delete().eq('id', id)
    setSnippets(s => s.filter(x => x.id !== id))
  }

  const copy = async (s: Snippet) => {
    await navigator.clipboard.writeText(s.code)
    setCopiedId(s.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="grid h-full grid-cols-1 gap-0 lg:grid-cols-2">
      {/* Form tambah */}
      <div className="overflow-y-auto border-r border-slate-800 p-6">
        <h2 className="mb-1 text-lg font-bold">Code Snippets</h2>
        <p className="mb-5 text-xs text-slate-500">Simpan potongan kode yang sering dipakai.</p>

        <form onSubmit={add} className="space-y-3">
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Judul snippet" required
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          />
          <select
            value={language} onChange={e => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          >
            {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <textarea
            value={code} onChange={e => setCode(e.target.value)}
            placeholder="// tempel kode di sini..." required rows={12}
            className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-xs outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Simpan Snippet
          </button>
        </form>
      </div>

      {/* Daftar */}
      <div className="space-y-3 overflow-y-auto p-6">
        {snippets.map(s => (
          <div key={s.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{s.title}</p>
                <span className="text-[11px] uppercase text-indigo-400">{s.language}</span>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => copy(s)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                  {copiedId === s.id ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
                <button onClick={() => remove(s.id)} className="rounded-lg p-2 text-slate-500 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-300">
              <code>{s.code}</code>
            </pre>
          </div>
        ))}
        {snippets.length === 0 && (
          <div className="flex flex-col items-center pt-16 text-slate-600">
            <Code2 className="mb-3 h-10 w-10" />
            <p className="text-sm">Belum ada snippet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
