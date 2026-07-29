import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Plus, Link as LinkIcon, Edit2, Trash2, Dices, Merge } from 'lucide-react';
import Navbar from '../components/Navbar';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import MergeTagsModal from '../components/MergeTagsModal';
import { useTags } from '../hooks/useTags';
import toast from 'react-hot-toast';

export default function TagsPage() {
  const navigate = useNavigate();
  const { tags, loading, fetchTags, createTag, updateTag, deleteTag, mergeTags, bulkDeleteTags } = useTags();
  
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Multi-select state
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const lastSelectedIndexRef = useRef(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Clear selection when tags list changes (e.g. after merge/delete)
  useEffect(() => {
    setSelectedTagIds((prev) => prev.filter((id) => tags.some((t) => t.id === id)));
  }, [tags]);

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

  // ── Selection helpers ────────────────────────────────────────────────────────

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTagIds(tags.map((t) => t.id));
    } else {
      setSelectedTagIds([]);
    }
    lastSelectedIndexRef.current = null;
  };

  const handleSelectRow = (id, shiftKey = false) => {
    const currentIndex = tags.findIndex((t) => t.id === id);

    if (shiftKey && lastSelectedIndexRef.current !== null) {
      const start = Math.min(lastSelectedIndexRef.current, currentIndex);
      const end   = Math.max(lastSelectedIndexRef.current, currentIndex);
      const rangeIds = tags.slice(start, end + 1).map((t) => t.id);
      const willCheck = !selectedTagIds.includes(id);

      setSelectedTagIds((prev) => {
        const set = new Set(prev);
        rangeIds.forEach((rid) => (willCheck ? set.add(rid) : set.delete(rid)));
        return [...set];
      });
    } else {
      setSelectedTagIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
      lastSelectedIndexRef.current = currentIndex;
    }
  };

  const handleRowClick = (tag, e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    // Checkbox cell — toggle selection
    if (e.target.closest('.select-column')) {
      if (!e.target.closest('input[type="checkbox"]')) {
        handleSelectRow(tag.id, e.shiftKey);
      }
      return;
    }
    handleEdit(tag);
  };

  // ── Form submit ──────────────────────────────────────────────────────────────

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

  // ── Individual delete ────────────────────────────────────────────────────────

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tag?')) return;
    try {
      await deleteTag(id);
      toast.success('Tag deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete tag');
    }
  };

  // ── Bulk delete ──────────────────────────────────────────────────────────────

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    try {
      await bulkDeleteTags(selectedTagIds);
      toast.success(`${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''} deleted`);
      setSelectedTagIds([]);
    } catch (err) {
      toast.error(err.message || 'Failed to delete tags');
    }
  };

  // ── Merge ────────────────────────────────────────────────────────────────────

  const handleMergeConfirm = async (winnerId) => {
    const loserIds = selectedTagIds.filter((id) => id !== winnerId);
    try {
      setMerging(true);
      await mergeTags(winnerId, loserIds);
      toast.success('Tags merged successfully!');
      setShowMergeModal(false);
      setSelectedTagIds([]);
      // Refresh to pick up updated question counts on the winner
      await fetchTags();
    } catch (err) {
      toast.error(err.message || 'Failed to merge tags');
    } finally {
      setMerging(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────

  const isAllSelected = tags.length > 0 && selectedTagIds.length === tags.length;
  const isSomeSelected = selectedTagIds.length > 0 && selectedTagIds.length < tags.length;
  const selectedTagObjects = tags.filter((t) => selectedTagIds.includes(t.id));

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

          {/* Bulk action toolbar — visible when ≥1 tag selected */}
          {selectedTagIds.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--primary-50)',
                border: '1px solid var(--primary-200)',
                borderRadius: 'var(--radius-lg)',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--primary-700)' }}>
                {selectedTagIds.length} selected
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowMergeModal(true)}
                  disabled={selectedTagIds.length < 2}
                  title={selectedTagIds.length < 2 ? 'Select at least 2 tags to merge' : `Merge ${selectedTagIds.length} tags`}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
                >
                  <Merge size={14} />
                  Merge ({selectedTagIds.length})
                </button>
                <button
                  className="btn btn-sm"
                  onClick={handleBulkDelete}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    background: 'var(--danger-500)',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  <Trash2 size={14} />
                  Delete ({selectedTagIds.length})
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setSelectedTagIds([]); lastSelectedIndexRef.current = null; }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
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
            <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--border-light)' }}>
                    <tr>
                      {/* Select-all checkbox */}
                      <th style={{ padding: 'var(--space-3) var(--space-4)', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                          onChange={handleSelectAll}
                          style={{ accentColor: 'var(--primary-600)', width: 16, height: 16, cursor: 'pointer' }}
                          title="Select all"
                        />
                      </th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '20%' }}>Tag Name</th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)' }}>Description</th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '10%' }}>Questions</th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '15%' }}>Knowledge</th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '15%' }}>Related URL</th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '12%' }}>Created At</th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '12%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <tr
                          key={tag.id}
                          style={{
                            borderBottom: '1px solid var(--border-light)',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            background: isSelected ? 'var(--primary-50)' : undefined,
                          }}
                          onClick={(e) => handleRowClick(tag, e)}
                          className="table-row-hover"
                        >
                          {/* Checkbox cell */}
                          <td
                            className="select-column"
                            style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'middle' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRow(tag.id, e.shiftKey);
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleSelectRow(tag.id, e.nativeEvent.shiftKey)}
                              onClick={(e) => e.stopPropagation()}
                              style={{ accentColor: 'var(--primary-600)', width: 16, height: 16, cursor: 'pointer' }}
                            />
                          </td>

                          <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              <Tag size={16} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                              <span style={{ fontWeight: 'var(--weight-medium)', color: 'var(--neutral-900)' }}>{tag.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top', color: 'var(--neutral-600)', fontSize: 'var(--text-sm)' }}>
                            {tag.description || <span style={{ color: 'var(--neutral-400)', fontStyle: 'italic' }}>No description</span>}
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top' }}>
                            {tag.question_count > 0 ? (
                              <span className="badge badge-neutral" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                {tag.question_count}
                              </span>
                            ) : (
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-300)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top' }}>
                            {tag.avg_score == null || tag.practiced_count === 0 ? (
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)', fontStyle: 'italic' }}>Not practiced</span>
                            ) : tag.avg_score >= 80 ? (
                              <span className="badge badge-success" style={{ fontSize: '11px', padding: '2px 8px' }}>{tag.avg_score}%</span>
                            ) : tag.avg_score >= 50 ? (
                              <span className="badge badge-warning" style={{ fontSize: '11px', padding: '2px 8px' }}>{tag.avg_score}%</span>
                            ) : (
                              <span className="badge badge-danger" style={{ fontSize: '11px', padding: '2px 8px' }}>{tag.avg_score}%</span>
                            )}
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top', fontSize: 'var(--text-sm)' }}>
                            {tag.link ? (
                              <a href={tag.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--primary-600)', textDecoration: 'none' }}>
                                <LinkIcon size={14} /> Link
                              </a>
                            ) : (
                              <span style={{ color: 'var(--neutral-400)', fontStyle: 'italic' }}>None</span>
                            )}
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top', fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>
                            {new Date(tag.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => navigate('/practice', { state: { preSelectedTags: [tag.name] } })}
                                title="Practice this tag"
                                style={{ color: 'var(--primary-600)' }}
                              >
                                <Dices size={14} />
                              </button>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => handleEdit(tag)}
                                title="Edit tag"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => handleDelete(tag.id)}
                                title="Delete tag"
                                style={{ color: 'var(--danger-500)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Merge Modal */}
      {showMergeModal && (
        <MergeTagsModal
          selectedTags={selectedTagObjects}
          onConfirm={handleMergeConfirm}
          onClose={() => setShowMergeModal(false)}
          merging={merging}
        />
      )}
    </>
  );
}
