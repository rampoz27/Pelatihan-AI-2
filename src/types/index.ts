export interface Profile {
  id: string
  email: string | null
  persona: string | null
  ai_base_url: string | null
  ai_model: string | null
  ai_api_key: string | null
}

export interface ChatSession {
  id: string; user_id: string; title: string; created_at: string
}

export interface ChatMessageRow {
  id: string; session_id: string; user_id: string
  role: 'user' | 'assistant'; content: string; created_at: string
}

export interface FileRow {
  id: string; user_id: string; name: string; path: string
  mime_type: string | null; size_bytes: number | null
  analysis: string | null; created_at: string
}

export interface Snippet {
  id: string; user_id: string; title: string; language: string
  code: string; created_at: string
}

export interface KnowledgeItem {
  id: string; user_id: string; title: string; category: string
  content: string; created_at: string
}
