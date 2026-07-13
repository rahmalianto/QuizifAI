-- ============================================
-- QuizifAI — Practice Scoring System Migration
-- ============================================

-- 1. Add last_practiced_at to questions
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS last_practiced_at timestamptz;

-- 2. Create function to update current_score and last_practiced_at
CREATE OR REPLACE FUNCTION public.update_question_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- correctness_score is between 0 and 1, current_score is 0-100
  UPDATE public.questions
  SET 
    current_score = (
      SELECT ROUND(AVG(correctness_score) * 100)
      FROM public.practice_activity
      WHERE question_id = NEW.question_id
    ),
    last_practiced_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.question_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger on practice_activity
DROP TRIGGER IF EXISTS on_practice_activity_insert ON public.practice_activity;
CREATE TRIGGER on_practice_activity_insert
  AFTER INSERT ON public.practice_activity
  FOR EACH ROW
  EXECUTE FUNCTION public.update_question_stats();

-- 4. Create the RPC function to get prioritized practice questions
CREATE OR REPLACE FUNCTION public.get_prioritized_practice_questions(
  p_user_id uuid,
  p_category_ids uuid[] DEFAULT NULL,
  p_tag_names text[] DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  category_id uuid,
  question_text text,
  question_image_url text,
  answer_type text,
  correct_answers text,
  incorrect_options text,
  material_reference text,
  current_score integer,
  last_practiced_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  category_name text,
  tags text[],
  priority_score float
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_questions AS (
    SELECT 
      q.id,
      q.category_id,
      q.question_text,
      q.question_image_url,
      q.answer_type,
      q.correct_answers,
      q.incorrect_options,
      q.material_reference,
      q.current_score,
      q.last_practiced_at,
      q.created_at,
      q.updated_at,
      c.name as category_name,
      ARRAY(
        SELECT t.name 
        FROM public.question_tags qt
        JOIN public.tags t ON qt.tag_id = t.id
        WHERE qt.question_id = q.id
          AND t.deleted_at IS NULL
      ) as tags,
      -- Priority Calculation:
      -- Base Inaccuracy (0 to 100): 100 - current_score
      -- Days Penalty: 5 points per day since last practice
      -- If never practiced, use 30 days penalty (150 points) + 100 base = 250
      (
        (100.0 - COALESCE(q.current_score, 0)) + 
        (EXTRACT(EPOCH FROM (NOW() - COALESCE(q.last_practiced_at, (NOW() - INTERVAL '30 days')))) / 86400.0) * 5.0
      )::float as calc_priority
    FROM public.questions q
    JOIN public.categories c ON q.category_id = c.id
    WHERE q.user_id = p_user_id
      AND q.deleted_at IS NULL
      AND (p_category_ids IS NULL OR array_length(p_category_ids, 1) IS NULL OR q.category_id = ANY(p_category_ids))
  )
  SELECT 
    fq.id,
    fq.category_id,
    fq.question_text,
    fq.question_image_url,
    fq.answer_type,
    fq.correct_answers,
    fq.incorrect_options,
    fq.material_reference,
    fq.current_score,
    fq.last_practiced_at,
    fq.created_at,
    fq.updated_at,
    fq.category_name,
    fq.tags,
    fq.calc_priority
  FROM filtered_questions fq
  WHERE (p_tag_names IS NULL OR array_length(p_tag_names, 1) IS NULL OR fq.tags && p_tag_names)
  ORDER BY fq.calc_priority DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
