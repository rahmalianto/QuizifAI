-- ============================================
-- QuizifAI — Initial Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- 1. Categories Table
-- ============================================
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for user-scoped queries
create index idx_categories_user_id on public.categories(user_id);

-- ============================================
-- 2. Questions Table
-- ============================================
create table public.questions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  question_text text not null,
  question_image_url text,
  answer_type text not null check (answer_type in ('MULTIPLE_CHOICE', 'CHECKBOX', 'SHORT_ANSWER', 'LONG_ANSWER')),
  correct_answers text not null, -- JSON array of correct string options
  incorrect_options text,        -- JSON array, nullable for text answers
  material_reference text,       -- Source citation from notes
  current_score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common query patterns
create index idx_questions_user_id on public.questions(user_id);
create index idx_questions_category_id on public.questions(category_id);
create index idx_questions_answer_type on public.questions(answer_type);
create index idx_questions_created_at on public.questions(created_at desc);

-- ============================================
-- 3. Question Tags Table
-- ============================================
create table public.question_tags (
  question_id uuid not null references public.questions(id) on delete cascade,
  tag_name text not null,
  primary key (question_id, tag_name)
);

-- Index for tag-based filtering
create index idx_question_tags_tag_name on public.question_tags(tag_name);

-- ============================================
-- 4. Session Logs Table
-- (Used by the Android app for quiz tracking)
-- ============================================
create table public.session_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index idx_session_logs_user_id on public.session_logs(user_id);
create index idx_session_logs_question_id on public.session_logs(question_id);

-- ============================================
-- 5. Auto-update updated_at Trigger
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_categories_updated
  before update on public.categories
  for each row
  execute function public.handle_updated_at();

create trigger on_questions_updated
  before update on public.questions
  for each row
  execute function public.handle_updated_at();

-- ============================================
-- 6. Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
alter table public.categories enable row level security;
alter table public.questions enable row level security;
alter table public.question_tags enable row level security;
alter table public.session_logs enable row level security;

-- Categories: users can only access their own
create policy "Users can view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- Questions: users can only access their own
create policy "Users can view own questions"
  on public.questions for select
  using (auth.uid() = user_id);

create policy "Users can insert own questions"
  on public.questions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own questions"
  on public.questions for update
  using (auth.uid() = user_id);

create policy "Users can delete own questions"
  on public.questions for delete
  using (auth.uid() = user_id);

-- Question Tags: access through question ownership
create policy "Users can view tags of own questions"
  on public.question_tags for select
  using (
    exists (
      select 1 from public.questions
      where questions.id = question_tags.question_id
      and questions.user_id = auth.uid()
    )
  );

create policy "Users can insert tags for own questions"
  on public.question_tags for insert
  with check (
    exists (
      select 1 from public.questions
      where questions.id = question_tags.question_id
      and questions.user_id = auth.uid()
    )
  );

create policy "Users can delete tags of own questions"
  on public.question_tags for delete
  using (
    exists (
      select 1 from public.questions
      where questions.id = question_tags.question_id
      and questions.user_id = auth.uid()
    )
  );

-- Session Logs: users can only access their own
create policy "Users can view own session logs"
  on public.session_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own session logs"
  on public.session_logs for insert
  with check (auth.uid() = user_id);

-- ============================================
-- Done! Your database is ready.
-- ============================================
