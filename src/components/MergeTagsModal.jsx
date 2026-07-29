import { Tag, Merge, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

/**
 * MergeTagsModal
 *
 * Props:
 *  - selectedTags: Tag[] — the tags the user selected (min 2)
 *  - onConfirm(winnerId): void
 *  - onClose(): void
 *  - merging: boolean — loading state while merge is in flight
 */
export default function MergeTagsModal({ selectedTags, onConfirm, onClose, merging }) {
  const [winnerId, setWinnerId] = useState(null);

  const loserCount = selectedTags.length - 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card animate-in"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-full)',
              background: 'var(--primary-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Merge size={20} style={{ color: 'var(--primary-600)' }} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Merge Tags</h3>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>
              {selectedTags.length} tags selected · {loserCount} will be removed
            </p>
          </div>
        </div>

        {/* Warning */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-2)',
            background: 'var(--warning-50, #fffbeb)',
            border: '1px solid var(--warning-200, #fde68a)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            fontSize: 'var(--text-sm)',
            color: 'var(--warning-800, #92400e)',
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            All questions linked to the non-surviving tags will be re-tagged to the winner.
            The other tags will be permanently removed. This cannot be undone.
          </span>
        </div>

        {/* Tag picker */}
        <div>
          <p style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
            Which tag should survive?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {selectedTags.map((tag) => {
              const isWinner = winnerId === tag.id;
              return (
                <label
                  key={tag.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${isWinner ? 'var(--primary-400)' : 'var(--border-light)'}`,
                    background: isWinner ? 'var(--primary-50)' : 'var(--neutral-50)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="merge-winner"
                    value={tag.id}
                    checked={isWinner}
                    onChange={() => setWinnerId(tag.id)}
                    style={{ accentColor: 'var(--primary-600)', width: 16, height: 16 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <Tag size={14} style={{ color: 'var(--primary-600)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 'var(--weight-medium)', color: 'var(--neutral-900)' }}>
                        {tag.name}
                      </span>
                      {tag.question_count > 0 && (
                        <span
                          className="badge badge-neutral"
                          style={{ fontSize: '11px', padding: '1px 7px', marginLeft: 'auto' }}
                        >
                          {tag.question_count} {tag.question_count === 1 ? 'question' : 'questions'}
                        </span>
                      )}
                    </div>
                    {tag.description && (
                      <p
                        style={{
                          margin: '2px 0 0',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--neutral-500)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tag.description}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={merging}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={!winnerId || merging}
            onClick={() => onConfirm(winnerId)}
          >
            {merging ? 'Merging…' : `Confirm Merge`}
          </button>
        </div>
      </div>
    </div>
  );
}
