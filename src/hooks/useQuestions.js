import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useQuestions() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [error, setError] = useState(null);

  /**
   * Call the Supabase Edge Function to generate questions from text
   */
  const generateQuestions = async ({ text, questionTypes, count, tags }) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setGenerating(true);
      setError(null);
      setGeneratedQuestions([]);

      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-questions',
        {
          body: {
            text,
            questionTypes,
            count,
            tags,
          },
        }
      );

      if (fnError) throw fnError;

      if (!data?.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid response from question generator');
      }

      // Add temporary IDs and metadata for the review UI
      const questionsWithMeta = data.questions.map((q, index) => ({
        ...q,
        _tempId: `temp-${Date.now()}-${index}`,
        _included: true,
        tags: q.tags || tags || [],
      }));

      setGeneratedQuestions(questionsWithMeta);
      return questionsWithMeta;
    } catch (err) {
      setError(err.message);
      console.error('Error generating questions:', err);
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Update a question in the generated list (before saving)
   */
  const updateGeneratedQuestion = (tempId, updates) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) =>
        q._tempId === tempId ? { ...q, ...updates } : q
      )
    );
  };

  /**
   * Toggle inclusion of a question
   */
  const toggleQuestionInclusion = (tempId) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) =>
        q._tempId === tempId ? { ...q, _included: !q._included } : q
      )
    );
  };

  /**
   * Remove a question from the generated list
   */
  const removeGeneratedQuestion = (tempId) => {
    setGeneratedQuestions((prev) =>
      prev.filter((q) => q._tempId !== tempId)
    );
  };

  /**
   * Include/exclude all questions
   */
  const setAllInclusion = (included) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => ({ ...q, _included: included }))
    );
  };

  /**
   * Save included questions to Supabase
   */
  const saveQuestions = async (categoryId) => {
    if (!user) throw new Error('Not authenticated');

    const questionsToSave = generatedQuestions.filter((q) => q._included);
    if (questionsToSave.length === 0) {
      throw new Error('No questions selected to save');
    }

    try {
      setSaving(true);
      setError(null);

      // Insert questions
      const questionRows = questionsToSave.map((q) => ({
        category_id: categoryId,
        user_id: user.id,
        question_text: q.question_text,
        answer_type: q.answer_type,
        correct_answers: JSON.stringify(q.correct_answers),
        incorrect_options: q.incorrect_options
          ? JSON.stringify(q.incorrect_options)
          : null,
        material_reference: q.material_reference || null,
        current_score: 0,
      }));

      const { data: insertedQuestions, error: insertError } = await supabase
        .from('questions')
        .insert(questionRows)
        .select();

      if (insertError) throw insertError;

      // Insert tags
      const tagRows = [];
      questionsToSave.forEach((q, index) => {
        const savedQuestion = insertedQuestions[index];
        if (q.tags && q.tags.length > 0 && savedQuestion) {
          q.tags.forEach((tag) => {
            tagRows.push({
              question_id: savedQuestion.id,
              tag_name: tag.trim(),
            });
          });
        }
      });

      if (tagRows.length > 0) {
        const { error: tagError } = await supabase
          .from('question_tags')
          .insert(tagRows);

        if (tagError) {
          console.error('Error inserting tags:', tagError);
          // Don't throw — questions are already saved
        }
      }

      return insertedQuestions;
    } catch (err) {
      setError(err.message);
      console.error('Error saving questions:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Save a single manual question to Supabase
   */
  const addManualQuestion = async ({
    categoryId,
    questionText,
    answerType,
    correctAnswers,
    incorrectOptions,
    tags = [],
  }) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setSaving(true);
      setError(null);

      const questionRow = {
        category_id: categoryId,
        user_id: user.id,
        question_text: questionText,
        answer_type: answerType,
        correct_answers: JSON.stringify(correctAnswers),
        incorrect_options: incorrectOptions
          ? JSON.stringify(incorrectOptions)
          : null,
        material_reference: 'Manual Entry',
        current_score: 0,
      };

      const { data: insertedQuestion, error: insertError } = await supabase
        .from('questions')
        .insert(questionRow)
        .select()
        .single();

      if (insertError) throw insertError;

      // Insert tags if any
      if (tags && tags.length > 0 && insertedQuestion) {
        const tagRows = tags.map((tag) => ({
          question_id: insertedQuestion.id,
          tag_name: tag.trim(),
        }));

        const { error: tagError } = await supabase
          .from('question_tags')
          .insert(tagRows);

        if (tagError) {
          console.error('Error inserting tags for manual question:', tagError);
        }
      }

      return insertedQuestion;
    } catch (err) {
      setError(err.message);
      console.error('Error saving manual question:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Fetch all questions across all categories for the user
   */
  const fetchAllQuestions = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');

    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('questions')
        .select('*, question_tags(tag_name), categories(name)')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      // Normalize
      return (data || []).map((q) => ({
        ...q,
        correct_answers:
          typeof q.correct_answers === 'string'
            ? JSON.parse(q.correct_answers)
            : q.correct_answers || [],
        incorrect_options:
          typeof q.incorrect_options === 'string'
            ? JSON.parse(q.incorrect_options)
            : q.incorrect_options || [],
        tags: (q.question_tags || []).map((t) => t.tag_name),
        category_name: q.categories?.name,
      }));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching all questions:', err);
      throw err;
    }
  }, [user]);

  /**
   * Fetch all questions for a given category from Supabase
   */
  const fetchQuestionsByCategory = useCallback(async (categoryId) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('questions')
        .select('*, question_tags(tag_name)')
        .eq('category_id', categoryId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Normalize: parse JSON strings and flatten tags
      return (data || []).map((q) => ({
        ...q,
        correct_answers:
          typeof q.correct_answers === 'string'
            ? JSON.parse(q.correct_answers)
            : q.correct_answers || [],
        incorrect_options:
          typeof q.incorrect_options === 'string'
            ? JSON.parse(q.incorrect_options)
            : q.incorrect_options || [],
        tags: (q.question_tags || []).map((t) => t.tag_name),
      }));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching questions:', err);
      throw err;
    }
  }, [user]);

  /**
   * Update an existing question in Supabase
   */
  const updateQuestion = async (questionId, {
    questionText,
    answerType,
    correctAnswers,
    incorrectOptions,
    tags,
  }) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setSaving(true);
      setError(null);

      const updates = {
        question_text: questionText,
        answer_type: answerType,
        correct_answers: JSON.stringify(correctAnswers),
        incorrect_options: incorrectOptions
          ? JSON.stringify(incorrectOptions)
          : null,
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', questionId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Sync tags: delete old, insert new
      if (tags !== undefined) {
        await supabase
          .from('question_tags')
          .delete()
          .eq('question_id', questionId);

        if (tags.length > 0) {
          const tagRows = tags.map((tag) => ({
            question_id: questionId,
            tag_name: tag.trim(),
          }));

          const { error: tagError } = await supabase
            .from('question_tags')
            .insert(tagRows);

          if (tagError) {
            console.error('Error syncing tags:', tagError);
          }
        }
      }

      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error updating question:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Delete a question from Supabase
   */
  const deleteQuestion = async (questionId) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting question:', err);
      throw err;
    }
  };

  /**
   * Clear generated questions
   */
  const clearGenerated = () => {
    setGeneratedQuestions([]);
    setError(null);
  };

  return {
    generatedQuestions,
    generating,
    saving,
    error,
    generateQuestions,
    updateGeneratedQuestion,
    toggleQuestionInclusion,
    removeGeneratedQuestion,
    setAllInclusion,
    saveQuestions,
    addManualQuestion,
    fetchAllQuestions,
    fetchQuestionsByCategory,
    updateQuestion,
    deleteQuestion,
    clearGenerated,
  };
}

