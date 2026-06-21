-- Add deleted_at columns for soft deletes
alter table public.questions add column if not exists deleted_at timestamptz;
alter table public.categories add column if not exists deleted_at timestamptz;
alter table public.tags add column if not exists deleted_at timestamptz;
