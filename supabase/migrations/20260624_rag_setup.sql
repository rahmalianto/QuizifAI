-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector
with
  schema extensions;

-- Create the table for storing OneNote page chunks and their embeddings
create table if not exists public.onenote_embeddings (
  id uuid primary key default gen_random_uuid(),
  page_id text not null,
  content text not null,
  embedding vector(768),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

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
  order by onenote_embeddings.embedding <=> query_embedding
  limit match_count;
$$;
