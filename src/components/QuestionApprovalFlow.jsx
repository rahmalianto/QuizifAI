import { useState } from 'react';
import {
  Check,
  X,
  Edit3,
  ArrowRight,
  Save,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ANSWER_TYPE_COLORS, QUESTION_TYPES } from '../lib/constants';

/**
 * One-by-one question approval flow.
 * Presents each generated question individually for user to approve, reject, or edit.
 */
export default function QuestionApprovalFlow({
  questions,
  onApprove,
  onReject,
  onEdit,
  onSave,
  saving,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [finished, setFinished] = useState(false);

  const total = questions.length;
  const current = questions[currentIndex];

  const approvedCount = questions.filter((q) => q._included === true).length;
  const rejectedCount = questions.filter((q) => q._included === false).length;
  const pendingCount = questions.filter((q) => q._included === null || q._included === undefined).length;

  const advance = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
      setEditing(false);
      setEditData(null);
    } else {
      setFinished(true);
    }
  };

  const handleApprove = () => {
    onApprove(current._tempId);
    advance();
  };

  const handleReject = () => {
    onReject(current._tempId);
    advance();
  };

  const startEdit = () => {
    setEditing(true);
    setEditData({
      question_text: current.question_text,
      correct_answers: [...current.correct_answers],
      incorrect_options: current.incorrect_options ? [...current.incorrect_options] : null,
    });
  };

  const saveEdit = () => {
    onEdit(current._tempId, editData);
    setEditing(false);
    setEditData(null);
  };

  const goTo = (idx) => {
    setCurrentIndex(idx);
    setEditing(false);
    setEditData(null);
    setFinished(false);
  };

  // Summary screen
  if (finished) {
    return (
      <div className="animate-in" style={{ textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--success-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              color: 'var(--success-600)',
            }}
          >
            <Check size={32} />
          </div>
          <h3 style={{ marginBottom: 'var(--space-2)' }}>Review Complete</h3>
          <p style={{ color: 'var(--neutral-600)', marginBottom: 'var(--space-6)' }}>
            You've reviewed all {total} questions.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 'var(--space-6)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--success-600)',
                }}
              >
                {approvedCount}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>
                Approved
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: 'var(--text-2xl)',
                  fontWeight: 'var(--weight-bold)',
                  color: 'var(--danger-500)',
                }}
              >
                {rejectedCount}
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>
                Rejected
              </div>
            </div>
          </div>

          {approvedCount > 0 ? (
            <button
              className="btn btn-primary btn-lg"
              onClick={onSave}
              disabled={saving}
              style={{ width: '100%' }}
            >
              {saving ? (
                <>
                  <div className="spinner">
                    <div
                      className="spinner-circle"
                      style={{ width: '18px', height: '18px', borderWidth: '2px' }}
                    ></div>
                  </div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} /> Save {approvedCount} Approved Questions
                </>
              )}
            </button>
          ) : (
            <p style={{ color: 'var(--neutral-500)', fontStyle: 'italic' }}>
              No questions were approved.
            </p>
          )}

          <button
            className="btn btn-ghost"
            onClick={() => goTo(0)}
            style={{ marginTop: 'var(--space-3)', width: '100%' }}
          >
            <ChevronLeft size={16} /> Review Again
          </button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const badgeColor = ANSWER_TYPE_COLORS[current.answer_type] || 'neutral';
  const typeLabel = QUESTION_TYPES[current.answer_type]?.label || current.answer_type;
  const progressPct = ((currentIndex) / total) * 100;
  const status = current._included === true ? 'approved' : current._included === false ? 'rejected' : 'pending';

  return (
    <div className="animate-in">
      {/* Progress bar */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--space-2)',
          }}
        >
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)' }}>
            Question {currentIndex + 1} of {total}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)' }}>
            ✅ {approvedCount} approved · ❌ {rejectedCount} rejected
          </span>
        </div>
        <div
          style={{
            height: '6px',
            background: 'var(--neutral-200)',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, var(--primary-400), var(--primary-600))',
              borderRadius: '3px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        {/* Dot navigation */}
        <div style={{ display: 'flex', gap: '4px', marginTop: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
          {questions.map((q, i) => {
            const s = q._included === true ? 'var(--success-500)' : q._included === false ? 'var(--danger-400)' : 'var(--neutral-300)';
            return (
              <button
                key={q._tempId}
                onClick={() => goTo(i)}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: s,
                  border: i === currentIndex ? '2px solid var(--primary-600)' : '2px solid transparent',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                title={`Question ${i + 1}`}
              />
            );
          })}
        </div>
      </div>

      {/* Question card */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <span className={`badge badge-${badgeColor}`}>{typeLabel}</span>
          {status === 'approved' && (
            <span className="badge badge-success" style={{ fontSize: '10px' }}>✅ Approved</span>
          )}
          {status === 'rejected' && (
            <span className="badge badge-danger" style={{ fontSize: '10px' }}>❌ Rejected</span>
          )}
        </div>

        {editing ? (
          /* Inline edit form */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label>Question Text</label>
              <textarea
                value={editData.question_text}
                onChange={(e) => setEditData({ ...editData, question_text: e.target.value })}
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="input-group">
              <label>Correct Answer(s)</label>
              {editData.correct_answers.map((ans, i) => (
                <input
                  key={i}
                  type="text"
                  value={ans}
                  onChange={(e) => {
                    const updated = [...editData.correct_answers];
                    updated[i] = e.target.value;
                    setEditData({ ...editData, correct_answers: updated });
                  }}
                  style={{ marginBottom: 'var(--space-2)' }}
                />
              ))}
            </div>

            {editData.incorrect_options && (
              <div className="input-group">
                <label>Incorrect Options</label>
                {editData.incorrect_options.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...editData.incorrect_options];
                      updated[i] = e.target.value;
                      setEditData({ ...editData, incorrect_options: updated });
                    }}
                    style={{ marginBottom: 'var(--space-2)' }}
                  />
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-primary btn-sm" onClick={saveEdit}>
                <Check size={14} /> Save Changes
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setEditData(null); }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Display mode */
          <>
            <h4 style={{ marginBottom: 'var(--space-4)', lineHeight: 'var(--leading-relaxed)' }}>
              {current.question_text}
            </h4>

            {/* Correct answers */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--success-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Correct Answer{current.correct_answers.length > 1 ? 's' : ''}
              </span>
              {current.correct_answers.map((a, i) => (
                <div
                  key={i}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--success-50)',
                    borderRadius: 'var(--radius-md)',
                    marginTop: 'var(--space-1)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--success-800)',
                    border: '1px solid var(--success-200)',
                  }}
                >
                  ✓ {a}
                </div>
              ))}
            </div>

            {/* Incorrect options */}
            {current.incorrect_options && current.incorrect_options.length > 0 && (
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Incorrect Options
                </span>
                {current.incorrect_options.map((o, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--neutral-50)',
                      borderRadius: 'var(--radius-md)',
                      marginTop: 'var(--space-1)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--neutral-600)',
                      border: '1px solid var(--neutral-200)',
                    }}
                  >
                    ✗ {o}
                  </div>
                ))}
              </div>
            )}

            {/* Material reference */}
            {current.material_reference && (
              <div style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--primary-50)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                color: 'var(--primary-700)',
                fontStyle: 'italic',
                borderLeft: '3px solid var(--primary-400)',
              }}>
                📖 {current.material_reference}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      {!editing && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-3)',
          }}
        >
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => goTo(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-ghost btn-sm" onClick={startEdit} title="Edit before approving">
              <Edit3 size={16} /> Edit
            </button>
            <button
              className="btn btn-sm"
              onClick={handleReject}
              style={{
                background: 'var(--danger-50)',
                color: 'var(--danger-600)',
                border: '1px solid var(--danger-200)',
              }}
            >
              <X size={16} /> Reject
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleApprove}>
              <Check size={16} /> Approve
            </button>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (currentIndex < total - 1) goTo(currentIndex + 1);
              else setFinished(true);
            }}
          >
            {currentIndex < total - 1 ? (
              <>Skip <ChevronRight size={16} /></>
            ) : (
              <>Finish <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
