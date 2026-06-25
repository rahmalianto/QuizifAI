import { useState, useEffect } from 'react';
import { X, Folder } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';

export default function BulkCategoryModal({ onClose, onConfirm }) {
  const { categories, fetchCategories } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    // category value is string, if empty string, it means "Uncategorized" (null)
    const categoryId = selectedCategory === '' ? null : selectedCategory;
    await onConfirm(categoryId);
    setSaving(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-in" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Folder size={20} color="var(--primary-600)" />
            <h2>Move to Category</h2>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <p style={{ color: 'var(--neutral-600)', marginBottom: 'var(--space-4)' }}>
            Select a category to move the selected questions into.
          </p>

          <div className="form-group">
            <label htmlFor="bulk-category">Category</label>
            <select
              id="bulk-category"
              className="input-field"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">-- Uncategorized --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-footer" style={{ marginTop: 'var(--space-6)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Moving...' : 'Move Questions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
