-- UA-DE Navigator lives in its own Supabase project. Never apply this to deutsch-klar.
create table if not exists public.navigator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_language text not null default 'ru' check (preferred_language in ('ru', 'uk', 'de', 'en')),
  federal_state text,
  city text,
  phone text,
  address text,
  lead_source text,
  lead_goal text check (lead_goal in ('route','document','question')),
  account_consent_at timestamptz not null,
  updates_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.navigator_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.navigator_sources (
  id text primary key,
  topic text not null,
  title text not null,
  authority text not null,
  url text not null,
  jurisdiction text not null default 'DE',
  status text not null default 'needs_review' check (status in ('needs_review', 'verified_online', 'temporarily_unavailable')),
  checked_at timestamptz,
  content_hash text,
  source_excerpt text,
  ai_summary text,
  validation_notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.navigator_source_checks (
  id bigint generated always as identity primary key,
  source_id text not null references public.navigator_sources(id) on delete cascade,
  checked_at timestamptz not null default now(),
  status text not null,
  http_status integer,
  content_hash text,
  changed boolean not null default false,
  validation_notes text
);
create index if not exists navigator_source_checks_source_time_idx
  on public.navigator_source_checks (source_id, checked_at desc);

create table if not exists public.navigator_ai_usage (
  visitor_hash text not null,
  day date not null default current_date,
  requests integer not null default 0,
  primary key (visitor_hash, day)
);

alter table public.navigator_profiles enable row level security;
alter table public.navigator_state enable row level security;
alter table public.navigator_sources enable row level security;
alter table public.navigator_source_checks enable row level security;
alter table public.navigator_ai_usage enable row level security;

grant usage on schema public to anon, authenticated;
grant select, update on public.navigator_profiles to authenticated;
grant select, insert, update on public.navigator_state to authenticated;
grant select on public.navigator_sources to anon, authenticated;
grant select, insert, update on public.navigator_sources,
  public.navigator_source_checks, public.navigator_ai_usage to service_role;
grant usage, select on sequence public.navigator_source_checks_id_seq to service_role;

create policy navigator_profiles_read_own on public.navigator_profiles
  for select to authenticated using (auth.uid() is not null and auth.uid() = user_id);
create policy navigator_profiles_update_own on public.navigator_profiles
  for update to authenticated using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);
create policy navigator_state_read_own on public.navigator_state
  for select to authenticated using (auth.uid() is not null and auth.uid() = user_id);
create policy navigator_state_write_own on public.navigator_state
  for insert to authenticated with check (auth.uid() is not null and auth.uid() = user_id);
create policy navigator_state_update_own on public.navigator_state
  for update to authenticated using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);
create policy navigator_sources_read on public.navigator_sources
  for select to anon, authenticated using (true);

create or replace function public.navigator_create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ->> 'app' = 'ua-de-navigator'
     and new.raw_user_meta_data ->> 'account_consent' = 'true' then
    insert into public.navigator_profiles (
      user_id, display_name, preferred_language, federal_state, lead_source, lead_goal,
      account_consent_at, updates_consent_at
    ) values (
      new.id,
      nullif(left(new.raw_user_meta_data ->> 'display_name', 100), ''),
      case when new.raw_user_meta_data ->> 'preferred_language' in ('ru','uk','de','en')
        then new.raw_user_meta_data ->> 'preferred_language' else 'ru' end,
      nullif(left(new.raw_user_meta_data ->> 'federal_state', 100), ''),
      nullif(left(new.raw_user_meta_data ->> 'lead_source', 100), ''),
      case when new.raw_user_meta_data ->> 'lead_goal' in ('route','document','question')
        then new.raw_user_meta_data ->> 'lead_goal' else null end,
      now(),
      case when new.raw_user_meta_data ->> 'updates_consent' = 'true' then now() else null end
    ) on conflict (user_id) do nothing;
    insert into public.navigator_state (user_id) values (new.id)
      on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists navigator_auth_user_created on auth.users;
create trigger navigator_auth_user_created
  after insert on auth.users for each row execute function public.navigator_create_profile();
