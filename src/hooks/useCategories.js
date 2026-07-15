import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch categories with question counts
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select(`
          *,
          questions(count)
        `)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .is('questions.deleted_at', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch knowledge scores per category
      const { data: scoreData } = await supabase.rpc('get_category_knowledge_scores', {
        p_user_id: user.id,
      });

      // Build a lookup map: category_id -> { avg_score, practiced_count }
      const scoreMap = {};
      (scoreData || []).forEach((s) => {
        scoreMap[s.category_id] = s;
      });

      const categoriesWithCounts = (data || []).map((cat) => ({
        ...cat,
        question_count: cat.questions?.[0]?.count || 0,
        avg_score: scoreMap[cat.id]?.avg_score ?? null,
        practiced_count: scoreMap[cat.id]?.practiced_count ?? 0,
      }));

      setCategories(categoriesWithCounts);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (name) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('categories')
      .insert({ name, user_id: user.id })
      .select()
      .single();

    if (error) throw error;

    setCategories((prev) => [{ ...data, question_count: 0 }, ...prev]);
    return data;
  };

  const updateCategory = async (id, name) => {
    const { data, error } = await supabase
      .from('categories')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === id ? { ...cat, ...data } : cat
      )
    );
    return data;
  };

  const deleteCategory = async (id) => {
    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
