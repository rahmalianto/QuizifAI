-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector
with
  schema extensions;

-- Create the table for storing OneNote page chunks and their embeddings
create table if not exists public.onenote_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  page_id text not null,
  content text not null,
  embedding vector(768),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.onenote_embeddings enable row level security;

-- Create RLS policies to restrict access to the owner
create policy "Users can view their own embeddings"
on public.onenote_embeddings for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own embeddings"
on public.onenote_embeddings for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own embeddings"
on public.onenote_embeddings for update
to authenticated
using (auth.uid() = user_id);

create policy "Users can delete their own embeddings"
on public.onenote_embeddings for delete
to authenticated
using (auth.uid() = user_id);

-- Create an index for faster similarity search (optional but recommended)
create index on public.onenote_embeddings using hnsw (embedding vector_cosine_ops);

-- Create a function to similarity search for chunks
create or replace function public.match_page_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  page_id text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    onenote_embeddings.id,
    onenote_embeddings.page_id,
    onenote_embeddings.content,
    1 - (onenote_embeddings.embedding <=> query_embedding) as similarity
  from onenote_embeddings
  where 1 - (onenote_embeddings.embedding <=> query_embedding) > match_threshold
    and onenote_embeddings.user_id = auth.uid()
  order by onenote_embeddings.embedding <=> query_embedding
  limit match_count;
$$;
