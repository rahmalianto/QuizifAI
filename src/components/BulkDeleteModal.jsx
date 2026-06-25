import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function BulkDeleteModal({ count, onClose, onConfirm }) {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await onConfirm();
    setSaving(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-in" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <AlertTriangle size={20} color="var(--danger-600)" />
            <h2 style={{ color: 'var(--danger-700)' }}>Delete Questions</h2>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} disabled={saving}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--neutral-700)', marginBottom: 'var(--space-4)' }}>
            Are you sure you want to delete <strong>{count}</strong> selected questions?
          </p>
          <p style={{ color: 'var(--danger-600)', fontSize: 'var(--text-sm)', background: 'var(--danger-50)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>
            This action cannot be undone. All related tags and practice activity history for these questions will also be removed or hidden.
          </p>
        </div>

        <div className="modal-footer" style={{ marginTop: 'var(--space-6)' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Deleting...' : 'Delete Questions'}
          </button>
        </div>
      </div>
    </div>
  );
}
