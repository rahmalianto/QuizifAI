-- ============================================
-- QuizifAI — Practice Activity Table
-- Run this in Supabase SQL Editor
-- ============================================

create table public.practice_activity (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  question_id uuid not null references public.questions(id) on delete cascade,
  correct_answer text,
  my_answer text,
  correctness_score numeric(3, 2) not null check (correctness_score >= 0 and correctness_score <= 1),
  answered_at timestamptz not null default now()
);

-- Indexes
create index idx_practice_activity_user_id on public.practice_activity(user_id);
create index idx_practice_activity_question_id on public.practice_activity(question_id);

-- RLS
alter table public.practice_activity enable row level security;

create policy "Users can view own practice activity"
  on public.practice_activity for select
  using (auth.uid() = user_id);

create policy "Users can insert own practice activity"
  on public.practice_activity for insert
  with check (auth.uid() = user_id);
