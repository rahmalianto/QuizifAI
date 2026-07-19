-- ============================================
-- QuizifAI — Add explanation field to questions
-- ============================================

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS explanation TEXT NULL;

COMMENT ON COLUMN public.questions.explanation IS
  'Optional explanation of why the correct answer is right, shown after the user answers in practice mode.';
