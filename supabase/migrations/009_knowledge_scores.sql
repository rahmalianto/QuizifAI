-- ============================================
-- QuizifAI — Knowledge Score Aggregates
-- ============================================

-- 1. Average knowledge score per category (pure accuracy, no time decay)
CREATE OR REPLACE FUNCTION public.get_category_knowledge_scores(p_user_id uuid)
RETURNS TABLE (
  category_id uuid,
  avg_score    numeric,
  practiced_count bigint,
  total_count  bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.category_id,
    ROUND(AVG(q.current_score), 0)          AS avg_score,
    COUNT(*) FILTER (WHERE q.last_practiced_at IS NOT NULL) AS practiced_count,
    COUNT(*)                                AS total_count
  FROM public.questions q
  WHERE q.user_id = p_user_id
    AND q.deleted_at IS NULL
  GROUP BY q.category_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Average knowledge score per tag (pure accuracy, no time decay)
CREATE OR REPLACE FUNCTION public.get_tag_knowledge_scores(p_user_id uuid)
RETURNS TABLE (
  tag_name     text,
  avg_score    numeric,
  practiced_count bigint,
  total_count  bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.name                                  AS tag_name,
    ROUND(AVG(q.current_score), 0)          AS avg_score,
    COUNT(*) FILTER (WHERE q.last_practiced_at IS NOT NULL) AS practiced_count,
    COUNT(*)                                AS total_count
  FROM public.tags t
  JOIN public.question_tags qt ON qt.tag_id = t.id
  JOIN public.questions q      ON q.id = qt.question_id
  WHERE t.user_id = p_user_id
    AND t.deleted_at IS NULL
    AND q.deleted_at IS NULL
  GROUP BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
