import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function useTags() {
  const { user } = useAuth();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch all tags for the current user
   */
  const fetchTags = useCallback(async () => {
    if (!user) return [];

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setTags(data || []);
      return data || [];
    } catch (err) {
      setError(err.message);
      console.error('Error fetching tags:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Create a new tag
   */
  const createTag = async ({ name, description, link }) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setError(null);

      const { data, error: createError } = await supabase
        .from('tags')
        .insert({
          user_id: user.id,
          name: name.trim().toLowerCase(),
          description: description || null,
          link: link || null,
        })
        .select()
        .single();

      if (createError) {
        if (createError.code === '23505') { // Unique violation
          throw new Error('A tag with this name already exists.');
        }
        throw createError;
      }

      setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error creating tag:', err);
      throw err;
    }
  };

  /**
   * Update an existing tag
   */
  const updateTag = async (tagId, { name, description, link }) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setError(null);

      const { data, error: updateError } = await supabase
        .from('tags')
        .update({
          name: name.trim().toLowerCase(),
          description: description || null,
          link: link || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tagId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        if (updateError.code === '23505') {
          throw new Error('A tag with this name already exists.');
        }
        throw updateError;
      }

      setTags((prev) =>
        prev.map((t) => (t.id === tagId ? data : t)).sort((a, b) => a.name.localeCompare(b.name))
      );
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error updating tag:', err);
      throw err;
    }
  };

  /**
   * Delete a tag
   */
  const deleteTag = async (tagId) => {
    if (!user) throw new Error('Not authenticated');

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('tags')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', tagId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (err) {
      setError(err.message);
      console.error('Error deleting tag:', err);
      throw err;
    }
  };

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
  };
}
