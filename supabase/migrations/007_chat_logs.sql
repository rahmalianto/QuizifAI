-- Create table for chat sessions
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for chat_sessions
alter table public.chat_sessions enable row level security;

-- Policies for chat_sessions
create policy "Users can view their own chat sessions"
on public.chat_sessions for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own chat sessions"
on public.chat_sessions for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own chat sessions"
on public.chat_sessions for delete
to authenticated
using (auth.uid() = user_id);

-- Create table for chat messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions on delete cascade not null,
  user_id uuid references auth.users not null default auth.uid(),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  context_used jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for chat_messages
alter table public.chat_messages enable row level security;

-- Policies for chat_messages
create policy "Users can view their own chat messages"
on public.chat_messages for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own chat messages"
on public.chat_messages for insert
to authenticated
with check (auth.uid() = user_id);

-- Create index on session_id for faster retrieval
create index on public.chat_messages (session_id);
