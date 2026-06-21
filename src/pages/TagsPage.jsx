import { useState, useEffect } from 'react';
import { Tag, Plus, Link as LinkIcon, Edit2, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTags } from '../hooks/useTags';
import toast from 'react-hot-toast';

export default function TagsPage() {
  const { tags, loading, fetchTags, createTag, updateTag, deleteTag } = useTags();
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setLink('');
    setShowCreate(false);
    setEditingId(null);
  };

  const handleEdit = (tag) => {
    setName(tag.name);
    setDescription(tag.description || '');
    setLink(tag.link || '');
    setEditingId(tag.id);
    setShowCreate(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      if (editingId) {
        await updateTag(editingId, { name, description, link });
        toast.success('Tag updated!');
      } else {
        await createTag({ name, description, link });
        toast.success('Tag created!');
      }
      resetForm();
    } catch (err) {
      toast.error(err.message || 'Failed to save tag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tag?')) return;
    try {
      await deleteTag(id);
      toast.success('Tag deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete tag');
    }
  };

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="container">
          {/* Header */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 id="tags-title">Tags Management</h1>
              <p>Create and manage tags to organize questions. Add descriptions and related links for context.</p>
            </div>
            {!showCreate && (
              <button
                className="btn btn-primary"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={16} />
                New Tag
              </button>
            )}
          </div>

          {/* Form */}
          {showCreate && (
            <div className="card animate-in" style={{ marginBottom: 'var(--space-6)', border: '1px solid var(--primary-200)' }}>
              <h3 style={{ marginBottom: 'var(--space-4)' }}>{editingId ? 'Edit Tag' : 'Create New Tag'}</h3>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="input-group">
                  <label>Tag Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., react, genetics, history-101"
                    autoFocus
                    required
                  />
                </div>
                
                <div className="input-group">
                  <label>Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this tag about?"
                    rows={2}
                    style={{ resize: 'vertical', width: '100%', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: 'var(--border-light)' }}
                  />
                </div>
                
                <div className="input-group">
                  <label>Related Link (Optional)</label>
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="e.g., https://en.wikipedia.org/wiki/React_(software)"
                  />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting || !name.trim()}>
                    {submitting ? 'Saving...' : 'Save Tag'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grid */}
          {loading && !tags.length ? (
            <LoadingSpinner text="Loading tags..." />
          ) : tags.length === 0 ? (
            !showCreate && (
              <EmptyState
                icon={Tag}
                title="No tags yet"
                description="Tags allow you to filter and categorize questions across different subjects."
                action={
                  <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    <Plus size={16} /> Create Your First Tag
                  </button>
                }
              />
            )
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {tags.map((tag, i) => (
                <div key={tag.id} className={`card animate-in stagger-${Math.min(i + 1, 6)}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <Tag size={18} color="var(--primary-600)" />
                      <h3 style={{ margin: 0, color: 'var(--neutral-900)' }}>{tag.name}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button onClick={() => handleEdit(tag)} className="btn-icon" title="Edit tag" style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--neutral-500)' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(tag.id)} className="btn-icon" title="Delete tag" style={{ padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger-500)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {tag.description && (
                    <p style={{ color: 'var(--neutral-600)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)', flex: 1 }}>
                      {tag.description}
                    </p>
                  )}
                  
                  {tag.link && (
                    <div style={{ marginTop: 'auto' }}>
                      <a href={tag.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--primary-600)', textDecoration: 'none' }}>
                        <LinkIcon size={14} />
                        Resource Link
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
