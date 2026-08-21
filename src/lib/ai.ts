import { supabase } from './supabase'

export interface AIMessage { role: 'system' | 'user' | 'assistant'; content: string }

interface AISettings {
  persona: string | null
  ai_base_url: string | null
  ai_model: string | null
  ai_api_key: string | null
}

async function getSettings(userId: string): Promise<AISettings> {
  const { data } = await supabase
    .from('profiles')
    .select('persona, ai_base_url, ai_model, ai_api_key')
    .eq('id', userId)
    .maybeSingle()
  return data ?? { persona: null, ai_base_url: null, ai_model: null, ai_api_key: null }
}

/** Ambil item pengetahuan yang paling relevan dengan pertanyaan (keyword matching). */
async function retrieveKnowledge(userId: string, query: string, limit = 5) {
  const { data } = await supabase
    .from('knowledge_items')
    .select('title, content')
    .eq('user_id', userId)
  if (!data || data.length === 0) return []

  const words = query.toLowerCase().split(/[^a-z0-9\u00c0-\u024f]+/).filter(w => w.length > 2)
  return data
    .map(item => {
      const text = `${item.title} ${item.content}`.toLowerCase()
      const score = words.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0)
      return { ...item, score }
    })
    .filter(i => i.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Kirim percakapan ke API AI (OpenAI-compatible).
 * Persona + pengetahuan relevan disuntikkan sebagai system prompt.
 */
export async function askAI(userId: string, history: AIMessage[]): Promise<string> {
  const s = await getSettings(userId)
  const apiKey = s.ai_api_key || import.meta.env.VITE_AI_API_KEY
  const baseUrl = s.ai_base_url || import.meta.env.VITE_AI_BASE_URL || 'https://api.openai.com/v1'
  const model = s.ai_model || import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini'

  if (!apiKey) throw new Error('API key AI belum diatur. Buka menu Settings untuk mengisinya.')

  const lastUserMsg = [...history].reverse().find(m => m.role === 'user')?.content ?? ''
  const knowledge = await retrieveKnowledge(userId, lastUserMsg)

  let system = s.persona?.trim() ||
    'Kamu adalah asisten AI yang membantu, ramah, dan menjawab dalam bahasa pengguna.'
  if (knowledge.length > 0) {
    system += '\n\nGunakan BASIS PENGETAHUAN berikut sebagai konteks utama jika relevan dengan pertanyaan:\n'
    knowledge.forEach((k, i) => {
      system += `\n[${i + 1}] ${k.title}:\n${k.content}\n`
    })
    system += '\nJika jawaban ada di basis pengetahuan, prioritaskan jawaban berdasarkan pengetahuan tersebut.'
  }

  const messages: AIMessage[] = [{ role: 'system', content: system }, ...history]

  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI API error ${res.status}: ${err.slice(0, 300)}`)
  }
  const json = await res.json()
  return json.choices?.[0]?.message?.content ?? '(tidak ada respons dari AI)'
}
