import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Trash2, Brain } from 'lucide-react'
import type { KnowledgeItem } from '../types'

export default function Knowledge() {
  const { user } = useAuth()
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Umum')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!user) return
    supabase.from('knowledge_items').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setItems(data ?? []))
  }, [user])

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim() || !content.trim()) return
    const { data } = await supabase.from('knowledge_items')
      .insert({ user_id: user.id, title: title.trim(), category: category.trim() || 'Umum', content })
      .select().single()
    if (data) {
      setItems(i => [data, ...i])
      setTitle(''); setContent('')
    }
  }

  const remove = async (id: string) => {
    await supabase.from('knowledge_items').delete().eq('id', id)
    setItems(i => i.filter(x => x.id !== id))
  }

  return (
    <div className="grid h-full grid-cols-1 gap-0 lg:grid-cols-2">
      <div className="overflow-y-auto border-r border-slate-800 p-6">
        <h2 className="mb-1 text-lg font-bold">Pengetahuan AI</h2>
        <p className="mb-5 text-xs text-slate-500">
          Ini adalah bahan "latihan" AI kamu. Setiap item di sini otomatis dipakai sebagai konteks
          saat AI menjawab pertanyaan yang relevan di menu AI Chat.
        </p>

        <form onSubmit={add} className="space-y-3">
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Judul pengetahuan (mis: Kebijakan refund toko saya)" required
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          />
          <input
            value={category} onChange={e => setCategory(e.target.value)}
            placeholder="Kategori (mis: Produk, FAQ, Aturan)"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          />
          <textarea
            value={content} onChange={e => setContent(e.target.value)}
            placeholder="Tulis isi pengetahuan secara lengkap..." required rows={12}
            className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Tambahkan ke Pengetahuan AI
          </button>
        </form>
      </div>

      <div className="space-y-3 overflow-y-auto p-6">
        {items.map(item => (
          <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.title}</p>
                <span className="mt-1 inline-block rounded-full bg-indigo-600/20 px-2 py-0.5 text-[11px] text-indigo-300">
                  {item.category}
                </span>
              </div>
              <button onClick={() => remove(item.id)} className="shrink-0 rounded-lg p-2 text-slate-500 hover:text-red-400">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{item.content}</p>
          </div>
        ))}
        {items.length === 0 && (
          <div className="flex flex-col items-center pt-16 text-slate-600">
            <Brain className="mb-3 h-10 w-10" />
            <p className="text-sm">Belum ada pengetahuan. Tambahkan di panel kiri.</p>
          </div>
        )}
      </div>
    </div>
  )
}
