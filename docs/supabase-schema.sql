-- QuantumX Supabase schema draft
-- Run this in a new Supabase project before connecting the frontend.
-- The current app is local-first. When Supabase env vars are configured,
-- this schema matches src/services/cloudMigration.ts and enables:
-- 1. account-scoped cloud restore,
-- 2. manual local-to-cloud migration,
-- 3. cloud mode snapshot upserts after local writes.
-- Do not rename distill_drafts, thought_topics, memory_feedback, or capture_drafts
-- unless the repository / migration layer is updated in the same change.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thoughts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  content text not null,
  source text not null default '快速记录',
  summary text not null default '',
  status text not null default 'inbox' check (
    status in ('inbox', 'linked', 'themed', 'distilled', 'archived')
  ),
  questions jsonb not null default '[]'::jsonb,
  related_thought_ids uuid[] not null default '{}',
  search_vector tsvector generated always as (
    to_tsvector('simple', coalesce(content, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(source, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  name text not null,
  summary text not null default '',
  description text not null default '',
  accent text not null default 'stone' check (
    accent in ('sage', 'clay', 'blue', 'amber', 'stone')
  ),
  signals text[] not null default '{}',
  distill jsonb not null default jsonb_build_object(
    'title', '',
    'format', '文章提纲',
    'basedOn', '',
    'outline', '[]'::jsonb,
    'cards', '[]'::jsonb
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.thought_topics (
  user_id uuid not null references auth.users(id) on delete cascade,
  thought_id uuid not null references public.thoughts(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (thought_id, topic_id)
);

create table if not exists public.distill_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  output_type text not null check (
    output_type in ('文章提纲', '复盘框架', '观点卡片')
  ),
  content text not null default '',
  source_thought_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memory_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_thought_id uuid references public.thoughts(id) on delete cascade,
  target_thought_id uuid references public.thoughts(id) on delete cascade,
  feedback_type text not null check (
    feedback_type in ('helpful', 'irrelevant', 'pinned', 'same_topic')
  ),
  context text,
  created_at timestamptz not null default now()
);

create table if not exists public.capture_drafts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_thoughts_updated_at on public.thoughts;
create trigger set_thoughts_updated_at
before update on public.thoughts
for each row execute function public.set_updated_at();

drop trigger if exists set_topics_updated_at on public.topics;
create trigger set_topics_updated_at
before update on public.topics
for each row execute function public.set_updated_at();

drop trigger if exists set_distill_drafts_updated_at on public.distill_drafts;
create trigger set_distill_drafts_updated_at
before update on public.distill_drafts
for each row execute function public.set_updated_at();

drop trigger if exists set_capture_drafts_updated_at on public.capture_drafts;
create trigger set_capture_drafts_updated_at
before update on public.capture_drafts
for each row execute function public.set_updated_at();

create index if not exists thoughts_user_created_at_idx
  on public.thoughts(user_id, created_at desc);

create unique index if not exists thoughts_user_client_id_idx
  on public.thoughts(user_id, client_id);

create index if not exists thoughts_user_status_idx
  on public.thoughts(user_id, status);

create index if not exists thoughts_search_vector_idx
  on public.thoughts using gin(search_vector);

create index if not exists topics_user_updated_at_idx
  on public.topics(user_id, updated_at desc);

create unique index if not exists topics_user_client_id_idx
  on public.topics(user_id, client_id);

create index if not exists thought_topics_user_topic_idx
  on public.thought_topics(user_id, topic_id);

create index if not exists distill_drafts_user_updated_at_idx
  on public.distill_drafts(user_id, updated_at desc);

create unique index if not exists distill_drafts_user_client_id_idx
  on public.distill_drafts(user_id, client_id);

create index if not exists memory_feedback_user_created_at_idx
  on public.memory_feedback(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.thoughts enable row level security;
alter table public.topics enable row level security;
alter table public.thought_topics enable row level security;
alter table public.distill_drafts enable row level security;
alter table public.memory_feedback enable row level security;
alter table public.capture_drafts enable row level security;

create policy "Profiles are private to owner"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Thoughts are private to owner"
on public.thoughts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Topics are private to owner"
on public.topics for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Thought topic links are private to owner"
on public.thought_topics for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Distill drafts are private to owner"
on public.distill_drafts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Memory feedback is private to owner"
on public.memory_feedback for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Capture drafts are private to owner"
on public.capture_drafts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
