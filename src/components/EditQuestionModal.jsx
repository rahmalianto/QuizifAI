import { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  CircleDot,
  CheckSquare,
  Type,
  AlignLeft,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import TagInput from './TagInput';
import { QUESTION_TYPE_LIST } from '../lib/constants';

const ICONS = {
  CircleDot,
  CheckSquare,
  Type,
  AlignLeft,
};

export default function EditQuestionModal({ question, saving, onSave, onClose, onDelete, generateExplanation }) {
  const [questionText, setQuestionText] = useState('');
  const [answerType, setAnswerType] = useState('MULTIPLE_CHOICE');
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [correctIndices, setCorrectIndices] = useState([]);
  const [shortAnswerText, setShortAnswerText] = useState('');
  const [longAnswerText, setLongAnswerText] = useState('');
  const [tags, setTags] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [optionExplanations, setOptionExplanations] = useState({}); // { optionText: explanationText }

  // Explanation generation state
  const [generatingExplanation, setGeneratingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState(null);

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Populate the form from the incoming question
  useEffect(() => {
    if (!question) return;

    setQuestionText(question.question_text || '');
    setAnswerType(question.answer_type || 'MULTIPLE_CHOICE');
    setTags(question.tags || []);
    setExplanation(question.explanation || '');
    setOptionExplanations(question.option_explanations || {});
    setConfirmDelete(false);
    setExplanationError(null);

    const correct = question.correct_answers || [];
    const incorrect = question.incorrect_options || [];

    if (question.answer_type === 'MULTIPLE_CHOICE') {
      const allOpts = [...correct, ...incorrect];
      setOptions(allOpts.length >= 2 ? allOpts : [...allOpts, '', ''].slice(0, Math.max(allOpts.length, 2)));
      setCorrectIndex(0);
    } else if (question.answer_type === 'CHECKBOX') {
      const allOpts = [...correct, ...incorrect];
      setOptions(allOpts.length >= 2 ? allOpts : [...allOpts, '', ''].slice(0, Math.max(allOpts.length, 2)));
      setCorrectIndices(correct.map((_, i) => i));
    } else if (question.answer_type === 'SHORT_ANSWER') {
      setShortAnswerText(correct[0] || '');
    } else if (question.answer_type === 'LONG_ANSWER') {
      setLongAnswerText(correct[0] || '');
    }
  }, [question]);

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (indexToRemove) => {
    if (options.length <= 2) return;
    const removedText = options[indexToRemove];
    const newOptions = options.filter((_, i) => i !== indexToRemove);
    setOptions(newOptions);

    // Remove from option explanations if present
    if (removedText && optionExplanations[removedText]) {
      const next = { ...optionExplanations };
      delete next[removedText];
      setOptionExplanations(next);
    }

    if (correctIndex === indexToRemove) {
      setCorrectIndex(0);
    } else if (correctIndex > indexToRemove) {
      setCorrectIndex(correctIndex - 1);
    }

    const newIndices = correctIndices
      .filter((i) => i !== indexToRemove)
      .map((i) => (i > indexToRemove ? i - 1 : i));
    setCorrectIndices(newIndices);
  };

  const handleCheckboxToggle = (index) => {
    if (correctIndices.includes(index)) {
      setCorrectIndices(correctIndices.filter((i) => i !== index));
    } else {
      setCorrectIndices([...correctIndices, index]);
    }
  };

  const handleOptionExplanationChange = (optionText, value) => {
    setOptionExplanations(prev => ({ ...prev, [optionText]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let correctAnswers = [];
    let incorrectOptions = [];

    if (answerType === 'MULTIPLE_CHOICE') {
      const activeOptions = options.map((opt) => opt.trim()).filter(Boolean);
      if (activeOptions.length < 2) return;
      const correctValue = options[correctIndex]?.trim();
      if (!correctValue) return;
      correctAnswers = [correctValue];
      incorrectOptions = activeOptions.filter((opt) => opt !== correctValue);
    } else if (answerType === 'CHECKBOX') {
      const activeOptions = options.map((opt) => opt.trim()).filter(Boolean);
      if (activeOptions.length < 2) return;
      const correctValues = correctIndices
        .map((i) => options[i]?.trim())
        .filter(Boolean);
      if (correctValues.length === 0) return;
      correctAnswers = correctValues;
      incorrectOptions = activeOptions.filter((opt) => !correctValues.includes(opt));
    } else if (answerType === 'SHORT_ANSWER') {
      if (!shortAnswerText.trim()) return;
      correctAnswers = [shortAnswerText.trim()];
      incorrectOptions = null;
    } else if (answerType === 'LONG_ANSWER') {
      if (!longAnswerText.trim()) return;
      correctAnswers = [longAnswerText.trim()];
      incorrectOptions = null;
    }

    // Clean up option_explanations: only keep entries that still exist as current options
    const allCurrentOptions = [...correctAnswers, ...(incorrectOptions || [])];
    const cleanedOptionExplanations = {};
    allCurrentOptions.forEach(opt => {
      if (optionExplanations[opt]) {
        cleanedOptionExplanations[opt] = optionExplanations[opt];
      }
    });

    onSave({
      questionText: questionText.trim(),
      answerType,
      correctAnswers,
      incorrectOptions,
      explanation: explanation.trim() || null,
      option_explanations: Object.keys(cleanedOptionExplanations).length > 0 ? cleanedOptionExplanations : null,
      tags,
    });
  };

  const handleRegenerateExplanation = async () => {
    if (!generateExplanation) return;
    setGeneratingExplanation(true);
    setExplanationError(null);
    try {
      let correctAnswers = [];
      let incorrectOpts = [];

      if (answerType === 'MULTIPLE_CHOICE') {
        const correctValue = options[correctIndex]?.trim();
        correctAnswers = correctValue ? [correctValue] : [];
        incorrectOpts = options.filter((_, i) => i !== correctIndex).map(o => o.trim()).filter(Boolean);
      } else if (answerType === 'CHECKBOX') {
        correctAnswers = correctIndices.map(i => options[i]?.trim()).filter(Boolean);
        incorrectOpts = options.filter((_, i) => !correctIndices.includes(i)).map(o => o.trim()).filter(Boolean);
      } else if (answerType === 'SHORT_ANSWER') {
        correctAnswers = [shortAnswerText.trim()].filter(Boolean);
      } else if (answerType === 'LONG_ANSWER') {
        correctAnswers = [longAnswerText.trim()].filter(Boolean);
      }

      const result = await generateExplanation({
        questionText: questionText.trim(),
        answerType,
        correctAnswers,
        incorrectOptions: incorrectOpts,
      });

      setExplanation(result.explanation || '');
      if (result.option_explanations) {
        setOptionExplanations(result.option_explanations);
      }
    } catch (e) {
      setExplanationError('Failed to generate explanation. Please try again.');
    } finally {
      setGeneratingExplanation(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await onDelete(question.id);
      onClose();
    } catch (e) {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && !saving && !deleting) {
        if (confirmDelete) {
          setConfirmDelete(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, saving, deleting, confirmDelete]);

  if (!question) return null;

  const hasOptions = answerType === 'MULTIPLE_CHOICE' || answerType === 'CHECKBOX';
  const isBusy = saving || deleting || generatingExplanation;

  // Render per-option explanation input for a given option text
  const renderOptionExplanationField = (optionText, isCorrect) => {
    if (!optionText.trim()) return null;
    return (
      <div style={{
        marginTop: 'var(--space-1)',
        marginLeft: 'calc(16px + var(--space-2) + var(--space-2))',
        paddingLeft: 'var(--space-3)',
        borderLeft: `2px solid ${isCorrect ? 'var(--success-200)' : 'var(--neutral-200)'}`,
      }}>
        <input
          type="text"
          value={optionExplanations[optionText] || ''}
          onChange={(e) => handleOptionExplanationChange(optionText, e.target.value)}
          placeholder={isCorrect ? 'Why this is correct...' : 'Why this is wrong...'}
          disabled={isBusy}
          style={{
            width: '100%',
            fontSize: 'var(--text-xs)',
            padding: 'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${isCorrect ? 'var(--success-200)' : 'var(--neutral-200)'}`,
            background: isCorrect ? 'var(--success-50)' : 'var(--neutral-50)',
            color: 'var(--neutral-700)',
          }}
        />
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isBusy) onClose(); }}>
      <div
        className="modal-content"
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
        id="edit-question-modal"
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <h3>Edit Question</h3>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            disabled={isBusy}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Question Text */}
          <div className="input-group">
            <label htmlFor="edit-question-text">Question Text</label>
            <textarea
              id="edit-question-text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter your question here..."
              style={{ minHeight: '80px' }}
              disabled={isBusy}
              required
            />
          </div>

          {/* Question-level Explanation — directly after Question Text */}
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                💡 Explanation
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)', fontWeight: 'normal' }}>
                  (optional — summary shown after answer)
                </span>
              </span>
              {generateExplanation && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleRegenerateExplanation}
                  disabled={isBusy || !questionText.trim()}
                  title="Generate explanation with AI"
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--primary-600)', padding: 'var(--space-1) var(--space-2)' }}
                  id="btn-regenerate-explanation"
                >
                  {generatingExplanation ? (
                    <><span style={{ width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Generating...</>
                  ) : (
                    <><Sparkles size={12} /> Regenerate</>
                  )}
                </button>
              )}
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why the correct answer is right..."
              disabled={isBusy}
              rows={3}
              style={{ resize: 'vertical', width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', fontSize: 'var(--text-sm)', lineHeight: '1.5' }}
            />
            {explanationError && (
              <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--danger-600)' }}>{explanationError}</p>
            )}
          </div>

          {/* Answer Type */}
          <div className="input-group">
            <label>Question Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
              {QUESTION_TYPE_LIST.map((type) => {
                const Icon = ICONS[type.icon];
                const isSelected = answerType === type.value;
                return (
                  <div
                    key={type.value}
                    className={`radio-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => !isBusy && setAnswerType(type.value)}
                    style={{ padding: 'var(--space-2) var(--space-3)', opacity: isBusy ? 0.6 : 1 }}
                  >
                    <input
                      type="radio"
                      name="editAnswerType"
                      checked={isSelected}
                      onChange={() => setAnswerType(type.value)}
                      disabled={isBusy}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {Icon && <Icon size={13} />}
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>
                        {type.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Answer Fields */}
          {answerType === 'MULTIPLE_CHOICE' && (
            <div className="input-group">
              <label>Options & Correct Answer</label>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)', marginBottom: 'var(--space-1)' }}>
                Select the radio button next to the correct answer. Add a per-option explanation below each option.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {options.map((option, index) => {
                  const isCorrect = correctIndex === index;
                  return (
                    <div key={index}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <input
                          type="radio"
                          name="edit-mc-correct"
                          checked={isCorrect}
                          onChange={() => setCorrectIndex(index)}
                          disabled={isBusy}
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          style={{ flex: 1 }}
                          disabled={isBusy}
                          required
                        />
                        {options.length > 2 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => handleRemoveOption(index)}
                            style={{ color: 'var(--danger-500)' }}
                            disabled={isBusy}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      {renderOptionExplanationField(option, isCorrect)}
                    </div>
                  );
                })}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddOption} disabled={isBusy} style={{ marginTop: 'var(--space-1)', alignSelf: 'flex-start' }}>
                <Plus size={14} /> Add Option
              </button>
            </div>
          )}

          {answerType === 'CHECKBOX' && (
            <div className="input-group">
              <label>Options & Correct Answers</label>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)', marginBottom: 'var(--space-1)' }}>
                Check the boxes next to the correct answers. Add a per-option explanation below each option.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {options.map((option, index) => {
                  const isCorrect = correctIndices.includes(index);
                  return (
                    <div key={index}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <input
                          type="checkbox"
                          checked={isCorrect}
                          onChange={() => handleCheckboxToggle(index)}
                          disabled={isBusy}
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          style={{ flex: 1 }}
                          disabled={isBusy}
                          required
                        />
                        {options.length > 2 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={() => handleRemoveOption(index)}
                            style={{ color: 'var(--danger-500)' }}
                            disabled={isBusy}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      {renderOptionExplanationField(option, isCorrect)}
                    </div>
                  );
                })}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddOption} disabled={isBusy} style={{ marginTop: 'var(--space-1)', alignSelf: 'flex-start' }}>
                <Plus size={14} /> Add Option
              </button>
            </div>
          )}

          {answerType === 'SHORT_ANSWER' && (
            <div className="input-group">
              <label htmlFor="edit-short-answer">Correct Answer</label>
              <input
                type="text"
                id="edit-short-answer"
                value={shortAnswerText}
                onChange={(e) => setShortAnswerText(e.target.value)}
                placeholder="Expected short answer..."
                disabled={isBusy}
                required
              />
            </div>
          )}

          {answerType === 'LONG_ANSWER' && (
            <div className="input-group">
              <label htmlFor="edit-long-answer">Model / Sample Answer</label>
              <textarea
                id="edit-long-answer"
                value={longAnswerText}
                onChange={(e) => setLongAnswerText(e.target.value)}
                placeholder="Enter a model answer..."
                style={{ minHeight: '100px' }}
                disabled={isBusy}
                required
              />
            </div>
          )}

          {/* Tags */}
          <TagInput
            tags={tags}
            onChange={setTags}
            placeholder="Add tags..."
            disabled={isBusy}
          />

          {/* Delete confirmation inline banner */}
          {confirmDelete && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--danger-50)',
              border: '1px solid var(--danger-200)',
              borderRadius: 'var(--radius-md)',
            }}>
              <AlertTriangle size={16} color="var(--danger-500)" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--danger-700)', fontWeight: 'var(--weight-medium)' }}>
                Delete this question permanently? This cannot be undone.
              </span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                style={{ background: 'white', border: '1px solid var(--neutral-300)', color: 'var(--neutral-700)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleDelete}
                disabled={deleting}
                id="btn-confirm-delete-question"
                style={{ background: 'var(--danger-500)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
              >
                {deleting ? (
                  <><span style={{ width: '12px', height: '12px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Deleting...</>
                ) : (
                  <><Trash2 size={13} /> Confirm Delete</>
                )}
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--space-2)' }}>
            {/* Left: Delete */}
            {onDelete && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleDelete}
                disabled={isBusy}
                id="btn-delete-question"
                style={{
                  color: confirmDelete ? 'var(--danger-600)' : 'var(--danger-400)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  border: confirmDelete ? '1px solid var(--danger-300)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <Trash2 size={15} />
                {confirmDelete ? 'Confirm?' : 'Delete Question'}
              </button>
            )}

            {/* Right: Cancel + Save */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginLeft: 'auto' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isBusy || !questionText.trim()}
                id="btn-save-edit"
              >
                {saving ? (
                  <>
                    <div className="spinner">
                      <div className="spinner-circle" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                    </div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
