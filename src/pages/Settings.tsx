import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Settings as SettingsIcon, Save } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()
  const [persona, setPersona] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setPersona(data.persona ?? '')
        setBaseUrl(data.ai_base_url ?? '')
        setModel(data.ai_model ?? '')
        setApiKey(data.ai_api_key ?? '')
      }
    })
  }, [user])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setStatus('saving')
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      persona, ai_base_url: baseUrl, ai_model: model, ai_api_key: apiKey,
    })
    setStatus(error ? 'error' : 'saved')
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600/20 p-2.5">
            <SettingsIcon className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Settings</h2>
            <p className="text-xs text-slate-500">Atur persona AI dan koneksi API AI (sang "guru").</p>
          </div>
        </div>

        <form onSubmit={save} className="space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-1 text-sm font-semibold">Persona AI</h3>
            <p className="mb-3 text-xs text-slate-500">
              Sistem prompt yang membentuk karakter AI kamu. Contoh: "Kamu adalah asisten customer
              service toko XYZ yang ramah, menjawab singkat, dan selalu berbahasa Indonesia."
            </p>
            <textarea
              value={persona} onChange={e => setPersona(e.target.value)} rows={5}
              placeholder="Tulis persona AI di sini..."
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
            />
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h3 className="mb-1 text-sm font-semibold">Koneksi AI API (OpenAI-compatible)</h3>
            <p className="mb-3 text-xs text-slate-500">
              Kompatibel dengan OpenAI, OpenRouter, Groq, Together, Ollama, dll.
              Kosongkan untuk memakai default dari environment.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Base URL</label>
                <input
                  value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Model</label>
                <input
                  value={model} onChange={e => setModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">API Key</label>
                <input
                  type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
                <p className="mt-1 text-[11px] text-amber-500/80">
                  ⚠️ API key disimpan di profil kamu (terlindungi RLS, hanya kamu yang bisa baca),
                  tetapi dipanggil langsung dari browser. Untuk produksi publik, sebaiknya lewat backend/proxy.
                </p>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <button
              type="submit" disabled={status === 'saving'}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> Simpan Settings
            </button>
            {status === 'saved' && <span className="text-sm text-emerald-400">✅ Tersimpan!</span>}
            {status === 'error' && <span className="text-sm text-red-400">❌ Gagal menyimpan.</span>}
          </div>
        </form>
      </div>
    </div>
  )
}
