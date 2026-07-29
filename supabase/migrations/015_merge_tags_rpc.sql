-- ============================================
-- QuizifAI — Merge Tags RPC
-- ============================================

-- Atomically merges one or more "loser" tags into a single "winner" tag.
-- Steps (all within one transaction):
--   1. Re-point question_tags rows from losers → winner (skipping questions
--      that already have the winner, to respect the PRIMARY KEY constraint).
--   2. Delete any remaining loser rows (the skipped duplicates).
--   3. Soft-delete the loser tag records.
--
-- NOTE: (question_id, tag_id) uniqueness is already enforced by the
--       PRIMARY KEY added in 003_tags_management.sql — no extra constraint needed.

create or replace function public.merge_tags(winner_id uuid, loser_ids uuid[])
returns void
language plpgsql
security definer
as $$
begin
  -- Step 1: Move loser rows that don't yet have a winner counterpart
  update public.question_tags
  set tag_id = winner_id
  where tag_id = any(loser_ids)
    and question_id not in (
      select question_id from public.question_tags where tag_id = winner_id
    );

  -- Step 2: Delete leftover loser rows (question already had the winner tag)
  delete from public.question_tags
  where tag_id = any(loser_ids);

  -- Step 3: Soft-delete the loser tags
  update public.tags
  set deleted_at = now()
  where id = any(loser_ids);
end;
$$;
