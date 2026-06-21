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
} from 'lucide-react';
import TagInput from './TagInput';
import { QUESTION_TYPE_LIST } from '../lib/constants';

const ICONS = {
  CircleDot,
  CheckSquare,
  Type,
  AlignLeft,
};

export default function EditQuestionModal({ question, saving, onSave, onClose }) {
  const [questionText, setQuestionText] = useState('');
  const [answerType, setAnswerType] = useState('MULTIPLE_CHOICE');
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [correctIndices, setCorrectIndices] = useState([]);
  const [shortAnswerText, setShortAnswerText] = useState('');
  const [longAnswerText, setLongAnswerText] = useState('');
  const [tags, setTags] = useState([]);

  // Populate the form from the incoming question
  useEffect(() => {
    if (!question) return;

    setQuestionText(question.question_text || '');
    setAnswerType(question.answer_type || 'MULTIPLE_CHOICE');
    setTags(question.tags || []);

    const correct = question.correct_answers || [];
    const incorrect = question.incorrect_options || [];

    if (question.answer_type === 'MULTIPLE_CHOICE') {
      const allOpts = [...correct, ...incorrect];
      setOptions(allOpts.length >= 2 ? allOpts : [...allOpts, '', ''].slice(0, Math.max(allOpts.length, 2)));
      setCorrectIndex(0); // correct is always the first in the merged array
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
    const newOptions = options.filter((_, i) => i !== indexToRemove);
    setOptions(newOptions);

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

    onSave({
      questionText: questionText.trim(),
      answerType,
      correctAnswers,
      incorrectOptions,
      tags,
    });
  };

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, saving]);

  if (!question) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
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
            disabled={saving}
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
              disabled={saving}
              required
            />
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
                    onClick={() => !saving && setAnswerType(type.value)}
                    style={{ padding: 'var(--space-2) var(--space-3)', opacity: saving ? 0.6 : 1 }}
                  >
                    <input
                      type="radio"
                      name="editAnswerType"
                      checked={isSelected}
                      onChange={() => setAnswerType(type.value)}
                      disabled={saving}
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
                Select the radio button next to the correct answer.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {options.map((option, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input
                      type="radio"
                      name="edit-mc-correct"
                      checked={correctIndex === index}
                      onChange={() => setCorrectIndex(index)}
                      disabled={saving}
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      style={{ flex: 1 }}
                      disabled={saving}
                      required
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleRemoveOption(index)}
                        style={{ color: 'var(--danger-500)' }}
                        disabled={saving}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddOption} disabled={saving} style={{ marginTop: 'var(--space-1)', alignSelf: 'flex-start' }}>
                <Plus size={14} /> Add Option
              </button>
            </div>
          )}

          {answerType === 'CHECKBOX' && (
            <div className="input-group">
              <label>Options & Correct Answers</label>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)', marginBottom: 'var(--space-1)' }}>
                Check the boxes next to the correct answers.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {options.map((option, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <input
                      type="checkbox"
                      checked={correctIndices.includes(index)}
                      onChange={() => handleCheckboxToggle(index)}
                      disabled={saving}
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      style={{ flex: 1 }}
                      disabled={saving}
                      required
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleRemoveOption(index)}
                        style={{ color: 'var(--danger-500)' }}
                        disabled={saving}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddOption} disabled={saving} style={{ marginTop: 'var(--space-1)', alignSelf: 'flex-start' }}>
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
                disabled={saving}
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
                disabled={saving}
                required
              />
            </div>
          )}

          {/* Tags */}
          <TagInput
            tags={tags}
            onChange={setTags}
            placeholder="Add tags..."
            disabled={saving}
          />

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !questionText.trim()}
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
        </form>
      </div>
    </div>
  );
}
