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

      if (fnError) {
        let errorMessage = fnError.message;
        if (fnError.context && fnError.context.error) {
          errorMessage = fnError.context.error;
          if (fnError.context.details) {
            errorMessage += `: ${fnError.context.details}`;
          }
        } else if (fnError.context && typeof fnError.context.text === 'function') {
          const text = await fnError.context.text();
          try {
            const parsed = JSON.parse(text);
            if (parsed.error) errorMessage = parsed.error;
            if (parsed.details) errorMessage += `: ${parsed.details}`;
          } catch (e) {
            errorMessage = text;
          }
        }
        throw new Error(errorMessage);
      }

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
   * Call the Supabase Edge Function to generate questions from an image
   */
  const generateQuestionsFromImage = async ({ imageBase64, mimeType, questionTypes, count, tags, prompt }) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setGenerating(true);
      setError(null);
      setGeneratedQuestions([]);

      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-questions-from-image',
        {
          body: {
            imageBase64,
            mimeType,
            questionTypes,
            count,
            tags,
            prompt,
          },
        }
      );

      if (fnError) {
        let errorMessage = fnError.message;
        if (fnError.context && fnError.context.error) {
          errorMessage = fnError.context.error;
          if (fnError.context.details) {
            errorMessage += `: ${fnError.context.details}`;
          }
        } else if (fnError.context && typeof fnError.context.text === 'function') {
          const text = await fnError.context.text();
          try {
            const parsed = JSON.parse(text);
            if (parsed.error) errorMessage = parsed.error;
            if (parsed.details) errorMessage += `: ${parsed.details}`;
          } catch (e) {
            errorMessage = text;
          }
        }
        throw new Error(errorMessage);
      }

      if (!data?.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid response from question generator');
      }

      // Add temporary IDs — _included starts as null (pending) for one-by-one review
      const questionsWithMeta = data.questions.map((q, index) => ({
        ...q,
        _tempId: `temp-${Date.now()}-${index}`,
        _included: null, // null = pending review
        tags: q.tags || tags || [],
      }));

      setGeneratedQuestions(questionsWithMeta);
      return questionsWithMeta;
    } catch (err) {
      setError(err.message);
      console.error('Error generating questions from image:', err);
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
        explanation: q.explanation || null,
        current_score: 0,
      }));

      const { data: insertedQuestions, error: insertError } = await supabase
        .from('questions')
        .insert(questionRows)
        .select();

      if (insertError) throw insertError;

      // Upsert tags
      const uniqueTagNames = [...new Set(questionsToSave.flatMap((q) => q.tags || []))]
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
        
      let tagMap = {};
      if (uniqueTagNames.length > 0) {
        const { data: upsertedTags, error: tagsError } = await supabase
          .from('tags')
          .upsert(
            uniqueTagNames.map((name) => ({ user_id: user.id, name })),
            { onConflict: 'user_id,name' }
          )
          .select();
          
        if (tagsError) {
          console.error('Error upserting tags:', tagsError);
        } else {
          upsertedTags.forEach((t) => {
            tagMap[t.name] = t.id;
          });
        }
      }

      // Insert tag relations
      const tagRows = [];
      questionsToSave.forEach((q, index) => {
        const savedQuestion = insertedQuestions[index];
        if (q.tags && q.tags.length > 0 && savedQuestion) {
          q.tags.forEach((tag) => {
            const tagName = tag.trim().toLowerCase();
            if (tagMap[tagName]) {
              tagRows.push({
                question_id: savedQuestion.id,
                tag_id: tagMap[tagName],
              });
            }
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
    explanation,
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
        explanation: explanation || null,
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
        const uniqueTagNames = [...new Set(tags)].map((t) => t.trim().toLowerCase()).filter(Boolean);
        
        const { data: upsertedTags, error: tagsError } = await supabase
          .from('tags')
          .upsert(
            uniqueTagNames.map((name) => ({ user_id: user.id, name })),
            { onConflict: 'user_id,name' }
          )
          .select();
          
        if (!tagsError && upsertedTags) {
          const tagRows = upsertedTags.map((t) => ({
            question_id: insertedQuestion.id,
            tag_id: t.id,
          }));

          const { error: tagError } = await supabase
            .from('question_tags')
            .insert(tagRows);

          if (tagError) {
            console.error('Error inserting tags for manual question:', tagError);
          }
        } else {
          console.error('Error upserting tags:', tagsError);
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
   * Fetch practice configuration
   */
  const fetchPracticeConfiguration = useCallback(async () => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('practice_configuration')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching practice configuration:', err);
      return null;
    }
  }, []);

  /**
   * Save practice configuration
   */
  const savePracticeConfiguration = useCallback(async (categoryIds, tagNames, questionCount) => {
    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('practice_configuration')
        .upsert({
          user_id: user.id,
          category: categoryIds,
          tag: tagNames,
          question_count: questionCount,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error saving practice configuration:', err);
      return false;
    }
  }, []);

  /**
   * Fetch all questions across all categories for the user
   */
  const fetchAllQuestions = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');

    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('questions')
        .select('*, question_tags(tags(name, deleted_at)), categories(name), practice_activity(count)')
        .eq('user_id', user.id)
        .is('deleted_at', null);

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
        tags: (q.question_tags || [])
          .filter((qt) => !qt.tags?.deleted_at)
          .map((qt) => qt.tags?.name)
          .filter(Boolean),
        category_name: q.categories?.name,
        attempt_count: q.practice_activity?.[0]?.count ?? 0,
      }));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching all questions:', err);
      throw err;
    }
  }, [user]);

  /**
   * Fetch prioritized questions for practice using the Supabase RPC
   */
  const fetchPrioritizedPracticeQuestions = useCallback(async (categoryIds = [], tagNames = [], limit = 10) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setError(null);
      const { data, error: fetchError } = await supabase.rpc('get_prioritized_practice_questions', {
        p_user_id: user.id,
        p_category_ids: categoryIds.length > 0 ? categoryIds : null,
        p_tag_names: tagNames.length > 0 ? tagNames : null,
        p_limit: limit
      });

      if (fetchError) throw fetchError;

      // Normalize
      return (data || []).map((q) => ({
        ...q,
        correct_answers: typeof q.correct_answers === 'string'
          ? JSON.parse(q.correct_answers)
          : q.correct_answers || [],
        incorrect_options: typeof q.incorrect_options === 'string'
          ? JSON.parse(q.incorrect_options)
          : q.incorrect_options || [],
        tags: q.tags || [],
        category_name: q.category_name,
      }));
    } catch (err) {
      setError(err.message);
      console.error('Error fetching prioritized practice questions:', err);
      throw err;
    }
  }, [user]);

  /**
   * Save practice activity
   */
  const savePracticeActivity = async ({ sessionId, questionId, correctAnswer, myAnswer, correctnessScore }) => {
    if (!user) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('practice_activity')
        .insert({
          user_id: user.id,
          session_id: sessionId,
          question_id: questionId,
          correct_answer: correctAnswer,
          my_answer: myAnswer,
          correctness_score: correctnessScore
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (err) {
      console.error('Error saving practice activity:', err);
    }
  };

  /**
   * Fetch all questions for a given category from Supabase
   */
  const fetchQuestionsByCategory = useCallback(async (categoryId) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('questions')
        .select('*, question_tags(tags(name, deleted_at))')
        .eq('category_id', categoryId)
        .eq('user_id', user.id)
        .is('deleted_at', null)
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
        tags: (q.question_tags || [])
          .filter((qt) => !qt.tags?.deleted_at)
          .map((qt) => qt.tags?.name)
          .filter(Boolean),
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
    explanation,
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
        explanation: explanation !== undefined ? (explanation || null) : undefined,
        updated_at: new Date().toISOString(),
      };

      // Remove undefined keys so we don't overwrite with undefined
      Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

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
          const uniqueTagNames = [...new Set(tags)].map((t) => t.trim().toLowerCase()).filter(Boolean);
          
          const { data: upsertedTags, error: tagsError } = await supabase
            .from('tags')
            .upsert(
              uniqueTagNames.map((name) => ({ user_id: user.id, name })),
              { onConflict: 'user_id,name' }
            )
            .select();
            
          if (!tagsError && upsertedTags) {
            const tagRows = upsertedTags.map((t) => ({
              question_id: questionId,
              tag_id: t.id,
            }));

            const { error: tagError } = await supabase
              .from('question_tags')
              .insert(tagRows);

            if (tagError) {
              console.error('Error syncing tags:', tagError);
            }
          } else {
            console.error('Error upserting tags:', tagsError);
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
        .update({ deleted_at: new Date().toISOString() })
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

  /**
   * Bulk update category for multiple questions
   */
  const bulkUpdateCategory = async (questionIds, categoryId) => {
    if (!user) throw new Error('Not authenticated');
    if (!questionIds?.length) return;

    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('questions')
        .update({ 
          category_id: categoryId,
          updated_at: new Date().toISOString()
        })
        .in('id', questionIds)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err.message);
      console.error('Error bulk updating category:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Bulk add tags to multiple questions
   */
  const bulkAddTags = async (questionIds, tagsToAdd) => {
    if (!user) throw new Error('Not authenticated');
    if (!questionIds?.length || !tagsToAdd?.length) return;

    try {
      setSaving(true);
      setError(null);

      const uniqueTagNames = [...new Set(tagsToAdd)].map(t => t.trim().toLowerCase()).filter(Boolean);
      if (uniqueTagNames.length === 0) return;

      // 1. Upsert the tags to ensure they exist
      const { data: upsertedTags, error: tagsError } = await supabase
        .from('tags')
        .upsert(
          uniqueTagNames.map((name) => ({ user_id: user.id, name })),
          { onConflict: 'user_id,name' }
        )
        .select();

      if (tagsError) throw tagsError;

      // 2. Fetch existing relations to avoid duplicates (optional but cleaner)
      // Or we can just insert and let constraints handle it if we had a unique constraint on (question_id, tag_id).
      // Let's manually filter or just insert ignore. Since Supabase insert might throw on duplicate, 
      // we'll fetch existing first.
      const { data: existingRelations } = await supabase
        .from('question_tags')
        .select('question_id, tag_id')
        .in('question_id', questionIds)
        .in('tag_id', upsertedTags.map(t => t.id));

      const existingSet = new Set((existingRelations || []).map(r => `${r.question_id}-${r.tag_id}`));

      const newRelations = [];
      questionIds.forEach(qId => {
        upsertedTags.forEach(tag => {
          if (!existingSet.has(`${qId}-${tag.id}`)) {
            newRelations.push({
              question_id: qId,
              tag_id: tag.id
            });
          }
        });
      });

      if (newRelations.length > 0) {
        const { error: insertError } = await supabase
          .from('question_tags')
          .insert(newRelations);
          
        if (insertError) throw insertError;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error bulk adding tags:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Bulk remove tags from multiple questions
   */
  const bulkRemoveTags = async (questionIds, tagsToRemove) => {
    if (!user) throw new Error('Not authenticated');
    if (!questionIds?.length || !tagsToRemove?.length) return;

    try {
      setSaving(true);
      setError(null);

      // Need to find the tag IDs for these names
      const tagNames = tagsToRemove.map(t => t.trim().toLowerCase());
      const { data: tagsInfo } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', user.id)
        .in('name', tagNames);

      if (tagsInfo && tagsInfo.length > 0) {
        const tagIds = tagsInfo.map(t => t.id);
        const { error: deleteError } = await supabase
          .from('question_tags')
          .delete()
          .in('question_id', questionIds)
          .in('tag_id', tagIds);

        if (deleteError) throw deleteError;
      }
    } catch (err) {
      setError(err.message);
      console.error('Error bulk removing tags:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Bulk delete questions
   */
  const bulkDeleteQuestions = async (questionIds) => {
    if (!user) throw new Error('Not authenticated');
    if (!questionIds?.length) return;

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('questions')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', questionIds)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
    } catch (err) {
      setError(err.message);
      console.error('Error bulk deleting questions:', err);
      throw err;
    }
  };

  return {
    generatedQuestions,
    generating,
    saving,
    error,
    generateQuestions,
    generateQuestionsFromImage,
    updateGeneratedQuestion,
    toggleQuestionInclusion,
    removeGeneratedQuestion,
    setAllInclusion,
    setGeneratedQuestions,
    saveQuestions,
    addManualQuestion,
    fetchPracticeConfiguration,
    savePracticeConfiguration,
    fetchAllQuestions,
    fetchPrioritizedPracticeQuestions,
    savePracticeActivity,
    fetchQuestionsByCategory,
    updateQuestion,
    deleteQuestion,
    bulkUpdateCategory,
    bulkAddTags,
    bulkRemoveTags,
    bulkDeleteQuestions,
    clearGenerated,
  };
}

