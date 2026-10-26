-- Only anonymized OCR text and its analysis are stored. The original PDF/image
-- and the unredacted OCR text remain in the client's browser.
create table if not exists public.navigator_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id text,
  source_type text not null check (source_type in ('pdf', 'image', 'text')),
  redacted_text text not null check (char_length(redacted_text) between 1 and 30000),
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists navigator_documents_user_created_idx
  on public.navigator_documents (user_id, created_at desc);

alter table public.navigator_documents enable row level security;
revoke all on public.navigator_documents from anon, authenticated;
grant select, insert on public.navigator_documents to authenticated;

create policy navigator_documents_read_own on public.navigator_documents
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy navigator_documents_insert_own on public.navigator_documents
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
