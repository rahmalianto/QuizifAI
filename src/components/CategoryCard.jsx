import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Edit3, Trash2, Check, X, HelpCircle, ArrowRight, Dices } from 'lucide-react';

export default function CategoryCard({ category, onUpdate, onDelete }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    if (editName.trim() && editName.trim() !== category.name) {
      await onUpdate(category.id, editName.trim());
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setEditName(category.name);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      await onDelete(category.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <div className="card" id={`category-card-${category.id}`}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--primary-50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-500)',
            flexShrink: 0,
          }}
        >
          <FolderOpen size={20} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                style={{ flex: 1 }}
                id={`category-edit-input-${category.id}`}
              />
              <button className="btn btn-ghost btn-icon" onClick={handleSave} title="Save">
                <Check size={16} style={{ color: 'var(--success-500)' }} />
              </button>
              <button className="btn btn-ghost btn-icon" onClick={handleCancel} title="Cancel">
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div
                style={{ cursor: 'pointer', flex: 1 }}
                onClick={() => navigate(`/categories/${category.id}`)}
              >
                <h5 style={{ marginBottom: 'var(--space-1)' }}>{category.name}</h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <HelpCircle size={14} style={{ color: 'var(--neutral-400)' }} />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>
                    {category.question_count} {category.question_count === 1 ? 'question' : 'questions'}
                  </span>
                  <span style={{ color: 'var(--neutral-300)', fontSize: 'var(--text-xs)' }}>·</span>
                  {category.avg_score == null || category.practiced_count === 0 ? (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)', fontStyle: 'italic' }}>Not practiced</span>
                  ) : category.avg_score >= 80 ? (
                    <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      Knowledge: {category.avg_score}%
                    </span>
                  ) : category.avg_score >= 50 ? (
                    <span className="badge badge-warning" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      Knowledge: {category.avg_score}%
                    </span>
                  ) : (
                    <span className="badge badge-danger" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      Knowledge: {category.avg_score}%
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {!editing && (
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setEditing(true)}
              title="Edit category"
              id={`category-edit-btn-${category.id}`}
            >
              <Edit3 size={16} />
            </button>
            <button
              className={`btn btn-ghost btn-icon ${confirmDelete ? 'btn-danger' : ''}`}
              onClick={handleDelete}
              title={confirmDelete ? 'Click again to confirm' : 'Delete category'}
              style={confirmDelete ? { color: 'var(--danger-500)' } : {}}
              id={`category-delete-btn-${category.id}`}
            >
              <Trash2 size={16} />
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => navigate(`/categories/${category.id}`)}
              title="View questions"
              id={`category-view-btn-${category.id}`}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Footer row */}
      <div style={{ marginTop: 'var(--space-3)', paddingLeft: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {category.created_at && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
            Created {new Date(category.created_at).toLocaleDateString()}
          </span>
        )}
        {!editing && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate('/practice', { state: { preSelectedCategories: [category.id] } })}
            title="Practice this category"
            id={`category-practice-btn-${category.id}`}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--primary-600)', borderColor: 'var(--primary-300)', marginLeft: 'auto' }}
          >
            <Dices size={14} />
            Practice
          </button>
        )}
      </div>
    </div>
  );
}
