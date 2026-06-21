import { useState } from 'react';
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
    clearGenerated,
  };
}
