-- ============================================
-- QuizifAI — Add explanation_image_url to questions & configure storage
-- ============================================

-- 1. Schema update
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS explanation_image_url TEXT NULL;

COMMENT ON COLUMN public.questions.explanation_image_url IS
  'Optional relative path to explanation image stored in Supabase Storage.';

COMMENT ON COLUMN public.questions.question_image_url IS
  'Optional relative path to question image stored in Supabase Storage.';


-- 2. Storage bucket creation
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', false)
ON CONFLICT (id) DO NOTHING;


-- 3. RLS policies for private objects
CREATE POLICY "Users can upload own images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'question-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read own images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'question-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'question-images' AND auth.uid()::text = (storage.foldername(name))[1]
  );
