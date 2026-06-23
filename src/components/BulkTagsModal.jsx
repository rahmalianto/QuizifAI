import { useState, useMemo } from 'react';
import { X, Tag, Plus, Trash2 } from 'lucide-react';

export default function BulkTagsModal({ selectedQuestions, onClose, onAddTags, onRemoveTags }) {
  const [activeTab, setActiveTab] = useState('add'); // 'add' or 'remove'
  
  // Add tags state
  const [tagInput, setTagInput] = useState('');
  const [savingAdd, setSavingAdd] = useState(false);

  // Remove tags state
  const [savingRemove, setSavingRemove] = useState(false);
  const [tagsToRemove, setTagsToRemove] = useState([]);

  // Compute the intersection (or union) of all tags present in selected questions
  const commonTags = useMemo(() => {
    if (!selectedQuestions || selectedQuestions.length === 0) return [];
    
    // Get unique tags across all selected questions
    const allTags = new Set();
    selectedQuestions.forEach(q => {
      if (q.tags && Array.isArray(q.tags)) {
        q.tags.forEach(t => allTags.add(t));
      }
    });
    
    return Array.from(allTags).sort();
  }, [selectedQuestions]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return;

    const newTags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (newTags.length === 0) return;

    setSavingAdd(true);
    await onAddTags(newTags);
    setSavingAdd(false);
  };

  const handleRemoveSubmit = async (e) => {
    e.preventDefault();
    if (tagsToRemove.length === 0) return;

    setSavingRemove(true);
    await onRemoveTags(tagsToRemove);
    setSavingRemove(false);
  };

  const toggleTagToRemove = (tag) => {
    setTagsToRemove(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content animate-in" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Tag size={20} color="var(--primary-600)" />
            <h2>Manage Tags</h2>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', marginBottom: 'var(--space-4)' }}>
          <button
            style={{
              flex: 1,
              padding: 'var(--space-3)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'add' ? '2px solid var(--primary-600)' : '2px solid transparent',
              color: activeTab === 'add' ? 'var(--primary-700)' : 'var(--neutral-600)',
              fontWeight: activeTab === 'add' ? 'var(--weight-semibold)' : 'var(--weight-medium)',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('add')}
          >
            Add Tags
          </button>
          <button
            style={{
              flex: 1,
              padding: 'var(--space-3)',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'remove' ? '2px solid var(--primary-600)' : '2px solid transparent',
              color: activeTab === 'remove' ? 'var(--primary-700)' : 'var(--neutral-600)',
              fontWeight: activeTab === 'remove' ? 'var(--weight-semibold)' : 'var(--weight-medium)',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('remove')}
          >
            Remove Tags
          </button>
        </div>

        {/* Tab Content: ADD */}
        {activeTab === 'add' && (
          <form onSubmit={handleAddSubmit} className="modal-body">
            <p style={{ color: 'var(--neutral-600)', marginBottom: 'var(--space-4)' }}>
              Append new tags to the {selectedQuestions.length} selected questions.
            </p>
            <div className="form-group">
              <label htmlFor="bulk-add-tags">New Tags (comma-separated)</label>
              <input
                id="bulk-add-tags"
                type="text"
                className="input-field"
                placeholder="e.g. review, final exam, hard"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
              />
            </div>
            <div className="modal-footer" style={{ marginTop: 'var(--space-6)' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={savingAdd}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingAdd || !tagInput.trim()}>
                <Plus size={16} /> {savingAdd ? 'Adding...' : 'Add Tags'}
              </button>
            </div>
          </form>
        )}

        {/* Tab Content: REMOVE */}
        {activeTab === 'remove' && (
          <form onSubmit={handleRemoveSubmit} className="modal-body">
            <p style={{ color: 'var(--neutral-600)', marginBottom: 'var(--space-4)' }}>
              Select tags to remove from the {selectedQuestions.length} selected questions.
            </p>

            {commonTags.length === 0 ? (
              <div style={{ padding: 'var(--space-4)', textAlign: 'center', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ color: 'var(--neutral-500)', fontSize: 'var(--text-sm)' }}>No tags found on the selected questions.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', maxHeight: '200px', overflowY: 'auto', padding: 'var(--space-2)' }}>
                {commonTags.map(tag => {
                  const isSelected = tagsToRemove.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTagToRemove(tag)}
                      style={{
                        padding: 'var(--space-1) var(--space-3)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: 'var(--text-sm)',
                        border: isSelected ? '1px solid var(--danger-500)' : '1px solid var(--border-base)',
                        background: isSelected ? 'var(--danger-50)' : 'white',
                        color: isSelected ? 'var(--danger-700)' : 'var(--neutral-700)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {tag} {isSelected && <X size={12} style={{ display: 'inline', marginLeft: '4px' }} />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: 'var(--space-6)' }}>
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={savingRemove}>
                Cancel
              </button>
              <button type="submit" className="btn btn-danger" disabled={savingRemove || tagsToRemove.length === 0}>
                <Trash2 size={16} /> {savingRemove ? 'Removing...' : 'Remove Tags'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
