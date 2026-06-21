import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Eye, EyeOff, X } from 'lucide-react';
import { ANSWER_TYPE_COLORS, QUESTION_TYPES } from '../lib/constants';

export default function QuestionCard({
  question,
  index,
  onUpdate,
  onToggleInclude,
  onRemove,
}) {
  const [expanded, setExpanded] = useState(true);

  const badgeColor = ANSWER_TYPE_COLORS[question.answer_type] || 'neutral';
  const typeLabel = QUESTION_TYPES[question.answer_type]?.label || question.answer_type;

  const handleFieldChange = (field, value) => {
    onUpdate(question._tempId, { [field]: value });
  };

  const handleCorrectAnswersChange = (value) => {
    const answers = value.split('\n').filter((a) => a.trim() !== '');
    handleFieldChange('correct_answers', answers);
  };

  const handleIncorrectOptionsChange = (value) => {
    const options = value.split('\n').filter((o) => o.trim() !== '');
    handleFieldChange('incorrect_options', options);
  };

  const handleTagRemove = (tagToRemove) => {
    const newTags = (question.tags || []).filter((t) => t !== tagToRemove);
    handleFieldChange('tags', newTags);
  };

  const handleTagAdd = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newTag = e.target.value.trim().toLowerCase();
      const currentTags = question.tags || [];
      if (!currentTags.includes(newTag)) {
        handleFieldChange('tags', [...currentTags, newTag]);
      }
      e.target.value = '';
    }
  };

  return (
    <div
      className={`question-card animate-in stagger-${Math.min(index + 1, 6)} ${!question._included ? 'excluded' : ''}`}
      id={`question-card-${index}`}
    >
      <div className="question-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span className="question-number">#{index + 1}</span>
          <span className={`badge badge-${badgeColor}`}>{typeLabel}</span>
        </div>
        <div className="question-card-actions">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onToggleInclude(question._tempId)}
            title={question._included ? 'Exclude question' : 'Include question'}
          >
            {question._included ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => onRemove(question._tempId)}
            title="Remove question"
            style={{ color: 'var(--danger-500)' }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="question-card-body">
          {/* Question Text */}
          <div className="field-group">
            <span className="field-label">Question</span>
            <textarea
              value={question.question_text || ''}
              onChange={(e) => handleFieldChange('question_text', e.target.value)}
              rows={2}
              style={{ minHeight: '60px' }}
              id={`question-text-${index}`}
            />
          </div>

          {/* Correct Answers */}
          <div className="field-group">
            <span className="field-label">Correct Answer(s) — one per line</span>
            <textarea
              value={(question.correct_answers || []).join('\n')}
              onChange={(e) => handleCorrectAnswersChange(e.target.value)}
              rows={2}
              style={{ minHeight: '48px' }}
              id={`correct-answers-${index}`}
            />
          </div>

          {/* Incorrect Options (only for MC/Checkbox) */}
          {(question.answer_type === 'MULTIPLE_CHOICE' || question.answer_type === 'CHECKBOX') && (
            <div className="field-group">
              <span className="field-label">Incorrect Options — one per line</span>
              <textarea
                value={(question.incorrect_options || []).join('\n')}
                onChange={(e) => handleIncorrectOptionsChange(e.target.value)}
                rows={2}
                style={{ minHeight: '48px' }}
                id={`incorrect-options-${index}`}
              />
            </div>
          )}

          {/* Material Reference */}
          <div className="field-group">
            <span className="field-label">Material Reference</span>
            <input
              type="text"
              value={question.material_reference || ''}
              onChange={(e) => handleFieldChange('material_reference', e.target.value)}
              placeholder="Source section or phrase"
              id={`material-ref-${index}`}
            />
          </div>

          {/* Tags */}
          <div className="field-group">
            <span className="field-label">Tags</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
              {(question.tags || []).map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button onClick={() => handleTagRemove(tag)}>
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add tag..."
                onKeyDown={handleTagAdd}
                style={{
                  border: 'none',
                  outline: 'none',
                  padding: 'var(--space-1)',
                  fontSize: 'var(--text-xs)',
                  width: '80px',
                  background: 'transparent',
                }}
                id={`tag-add-${index}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
