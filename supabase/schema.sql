-- ========== TABLES ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  persona text default '',
  ai_base_url text default '',
  ai_model text default '',
  ai_api_key text default '',
  created_at timestamptz default now()
);

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default 'Percakapan baru',
  created_at timestamptz default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  path text not null,
  mime_type text,
  size_bytes bigint,
  analysis text default '',
  created_at timestamptz default now()
);

create table public.code_snippets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  language text default 'text',
  code text not null,
  created_at timestamptz default now()
);

create table public.knowledge_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text default 'Umum',
  content text not null,
  created_at timestamptz default now()
);

-- ========== ROW LEVEL SECURITY ==========
alter table public.profiles enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.files enable row level security;
alter table public.code_snippets enable row level security;
alter table public.knowledge_items enable row level security;

create policy "profiles select own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "sessions all own" on public.chat_sessions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages all own" on public.chat_messages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "files all own" on public.files for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "snippets all own" on public.code_snippets for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "knowledge all own" on public.knowledge_items for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========== AUTO-CREATE PROFILE SAAT DAFTAR ==========
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== STORAGE BUCKET UNTUK FILE ==========
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict (id) do nothing;

create policy "upload own files" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "read own files" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own files" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
