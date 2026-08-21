import { ChangeEvent, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { askAI } from '../lib/ai'
import { Upload, FileText, Sparkles, Trash2, Loader2 } from 'lucide-react'
import type { FileRow } from '../types'

const ACCEPTED = ['.txt', '.md', '.csv', '.json', '.js', '.ts', '.tsx', '.jsx', '.py', '.html', '.css', '.log', '.yml', '.yaml', '.sql']

export default function FileAnalysis() {
  const { user } = useAuth()
  const [files, setFiles] = useState<FileRow[]>([])
  const [busy, setBusy] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<FileRow | null>(null)

  useEffect(() => {
    if (!user) return
    supabase.from('files').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setFiles(data ?? []))
  }, [user])

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setError(''); setBusy(true)
    try {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
      if (!ACCEPTED.includes(ext)) {
        throw new Error(`Format ${ext} tidak didukung. Gunakan file teks: ${ACCEPTED.join(', ')}`)
      }
      const path = `${user.id}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('uploads').upload(path, file)
      if (upErr) throw upErr

      const { data } = await supabase.from('files')
        .insert({ user_id: user.id, name: file.name, path, mime_type: file.type, size_bytes: file.size })
        .select().single()
      if (data) setFiles(f => [data, ...f])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const analyze = async (file: FileRow) => {
    if (!user) return
    setBusyId(file.id); setSelected(file); setError('')
    try {
      const { data: blob, error: dlErr } = await supabase.storage.from('uploads').download(file.path)
      if (dlErr || !blob) throw new Error('Gagal mengunduh isi file')
      const text = (await blob.text()).slice(0, 12000)

      const reply = await askAI(user.id, [{
        role: 'user',
        content: `Analisis file bernama "${file.name}" berikut. Berikan: 1) Ringkasan isi, 2) Poin-poin penting, 3) Insight atau saran.\n\n---ISI FILE---\n${text}`,
      }])

      await supabase.from('files').update({ analysis: reply }).eq('id', file.id)
      setFiles(fs => fs.map(f => f.id === file.id ? { ...f, analysis: reply } : f))
      setSelected(prev => prev && prev.id === file.id ? { ...prev, analysis: reply } : prev)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (file: FileRow) => {
    await supabase.storage.from('uploads').remove([file.path])
    await supabase.from('files').delete().eq('id', file.id)
    setFiles(f => f.filter(x => x.id !== file.id))
    if (selected?.id === file.id) setSelected(null)
  }

  return (
    <div className="flex h-full">
      <div className="flex w-[45%] min-w-[320px] flex-col border-r border-slate-800">
        <div className="space-y-3 border-b border-slate-800 p-5">
          <h2 className="text-lg font-bold">Analisis File</h2>
          <p className="text-xs text-slate-500">Upload file teks, lalu minta AI menganalisis isinya.</p>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-900 py-4 text-sm text-slate-400 transition hover:border-indigo-500 hover:text-indigo-400">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? 'Mengupload...' : 'Klik untuk upload file'}
            <input type="file" className="hidden" accept={ACCEPTED.join(',')} onChange={handleUpload} disabled={busy} />
          </label>
          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {files.map(f => (
            <div
              key={f.id}
              onClick={() => setSelected(f)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                selected?.id === f.id ? 'border-indigo-500 bg-slate-800' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <FileText className="h-5 w-5 shrink-0 text-slate-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{f.name}</p>
                <p className="text-[11px] text-slate-500">
                  {f.size_bytes ? `${Math.round((f.size_bytes / 1024) * 10) / 10} KB` : '-'} ·{' '}
                  {f.analysis ? '✅ sudah dianalisis' : 'belum dianalisis'}
                </p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); analyze(f) }}
                disabled={busyId !== null}
                className="rounded-lg bg-indigo-600/20 p-2 text-indigo-400 hover:bg-indigo-600/40 disabled:opacity-40"
                title="Analisis dengan AI"
              >
                {busyId === f.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </button>
              <button
                onClick={e => { e.stopPropagation(); remove(f) }}
                className="rounded-lg p-2 text-slate-600 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {files.length === 0 && <p className="pt-10 text-center text-sm text-slate-600">Belum ada file.</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <div>
            <h3 className="mb-1 font-bold">{selected.name}</h3>
            <p className="mb-4 text-xs text-slate-500">Hasil analisis AI</p>
            {selected.analysis ? (
              <div className="whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-900 p-5 text-sm leading-relaxed text-slate-200">
                {selected.analysis}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                File belum dianalisis. Klik tombol ✨ di samping file untuk memulai.
              </p>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-slate-600">
            <FileText className="mb-3 h-12 w-12" />
            <p className="text-sm">Pilih file untuk melihat hasil analisis.</p>
          </div>
        )}
      </div>
    </div>
  )
}
