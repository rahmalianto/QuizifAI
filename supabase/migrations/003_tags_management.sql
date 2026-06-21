-- ============================================
-- QuizifAI — Tags Management Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create tags table
create table public.tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create index idx_tags_user_id on public.tags(user_id);

create trigger on_tags_updated
  before update on public.tags
  for each row
  execute function public.handle_updated_at();

-- RLS for tags
alter table public.tags enable row level security;

create policy "Users can view own tags"
  on public.tags for select
  using (auth.uid() = user_id);

create policy "Users can insert own tags"
  on public.tags for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tags"
  on public.tags for update
  using (auth.uid() = user_id);

create policy "Users can delete own tags"
  on public.tags for delete
  using (auth.uid() = user_id);

-- 2. Add tag_id to question_tags
alter table public.question_tags add column tag_id uuid references public.tags(id) on delete cascade;

-- 3. Data Migration: create tags for existing question_tags
insert into public.tags (user_id, name)
select distinct q.user_id, qt.tag_name
from public.question_tags qt
join public.questions q on q.id = qt.question_id
on conflict (user_id, name) do nothing;

-- 4. Data Migration: link tag_id in question_tags
update public.question_tags qt
set tag_id = t.id
from public.tags t, public.questions q
where q.id = qt.question_id 
  and qt.tag_name = t.name 
  and q.user_id = t.user_id;

-- 5. Drop old tag_name and update Primary Key
alter table public.question_tags drop constraint question_tags_pkey;
alter table public.question_tags drop column tag_name;

-- Now that tag_id is populated, set it to not null
alter table public.question_tags alter column tag_id set not null;

-- Set new primary key
alter table public.question_tags add primary key (question_id, tag_id);

-- Add index on tag_id
create index idx_question_tags_tag_id on public.question_tags(tag_id);
