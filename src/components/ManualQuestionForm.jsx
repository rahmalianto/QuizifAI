import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Save,
  CircleDot,
  CheckSquare,
  Type,
  AlignLeft,
  X,
  ArrowLeft,
} from 'lucide-react';
import TagInput from './TagInput';
import { useQuestions } from '../hooks/useQuestions';
import { QUESTION_TYPE_LIST } from '../lib/constants';
import toast from 'react-hot-toast';

const ICONS = {
  CircleDot,
  CheckSquare,
  Type,
  AlignLeft,
};

export default function ManualQuestionForm({ categories, createCategory }) {
  const navigate = useNavigate();
  const { addManualQuestion, saving } = useQuestions();

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [questionText, setQuestionText] = useState('');
  const [answerType, setAnswerType] = useState('MULTIPLE_CHOICE');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [correctIndices, setCorrectIndices] = useState([]);
  const [shortAnswerText, setShortAnswerText] = useState('');
  const [longAnswerText, setLongAnswerText] = useState('');
  const [tags, setTags] = useState([]);
  const [explanation, setExplanation] = useState('');

  // Pre-select first category if available
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

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

  const handleSave = async (e) => {
    e.preventDefault();

    let categoryId = selectedCategoryId;
    if (!categoryId && newCategoryName.trim()) {
      try {
        setCreatingCategory(true);
        const newCat = await createCategory(newCategoryName.trim());
        categoryId = newCat.id;
        setSelectedCategoryId(categoryId);
      } catch (err) {
        toast.error('Failed to create category');
        setCreatingCategory(false);
        return;
      } finally {
        setCreatingCategory(false);
      }
    }

    if (!categoryId) {
      toast.error('Please select or create a category');
      return;
    }

    if (!questionText.trim()) {
      toast.error('Please enter the question text');
      return;
    }

    let correctAnswers = [];
    let incorrectOptions = [];

    if (answerType === 'MULTIPLE_CHOICE') {
      const activeOptions = options.map((opt) => opt.trim()).filter(Boolean);
      if (activeOptions.length < 2) {
        toast.error('Please provide at least 2 non-empty options');
        return;
      }

      const correctValue = options[correctIndex]?.trim();
      if (!correctValue) {
        toast.error('Please fill in the text for the selected correct option');
        return;
      }

      correctAnswers = [correctValue];
      incorrectOptions = activeOptions.filter((opt) => opt !== correctValue);
    } else if (answerType === 'CHECKBOX') {
      const activeOptions = options.map((opt) => opt.trim()).filter(Boolean);
      if (activeOptions.length < 2) {
        toast.error('Please provide at least 2 non-empty options');
        return;
      }

      const correctValues = correctIndices
        .map((i) => options[i]?.trim())
        .filter(Boolean);

      if (correctValues.length === 0) {
        toast.error('Please select at least 1 correct option');
        return;
      }

      correctAnswers = correctValues;
      incorrectOptions = activeOptions.filter((opt) => !correctValues.includes(opt));
    } else if (answerType === 'SHORT_ANSWER') {
      if (!shortAnswerText.trim()) {
        toast.error('Please enter a correct answer');
        return;
      }
      correctAnswers = [shortAnswerText.trim()];
      incorrectOptions = null;
    } else if (answerType === 'LONG_ANSWER') {
      if (!longAnswerText.trim()) {
        toast.error('Please enter a model answer');
        return;
      }
      correctAnswers = [longAnswerText.trim()];
      incorrectOptions = null;
    }

    try {
      await addManualQuestion({
        categoryId,
        questionText: questionText.trim(),
        answerType,
        correctAnswers,
        incorrectOptions,
        explanation: explanation.trim() || null,
        tags,
      });

      toast.success('Question created successfully!');

      // Reset form fields
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectIndex(0);
      setCorrectIndices([]);
      setShortAnswerText('');
      setLongAnswerText('');
      setTags([]);
      setExplanation('');
    } catch (err) {
      toast.error(err.message || 'Failed to save question');
    }
  };

  return (
    <form onSubmit={handleSave} className="animate-in">
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Category Selection */}
          <div className="input-group">
            <label htmlFor="category-select-manual">Category</label>
            <select
              id="category-select-manual"
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                if (e.target.value) setNewCategoryName('');
              }}
              disabled={saving || creatingCategory}
            >
              <option value="">— Select a category —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.question_count} questions)
                </option>
              ))}
            </select>

            <div className="divider">or</div>

            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value);
                if (e.target.value) setSelectedCategoryId('');
              }}
              placeholder="Create a new category..."
              id="new-category-input-manual"
              disabled={saving || creatingCategory}
            />
          </div>

          {/* Question Text */}
          <div className="input-group">
            <label htmlFor="question-text-manual">Question Text</label>
            <textarea
              id="question-text-manual"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter your question here..."
              style={{ minHeight: '100px' }}
              disabled={saving}
              required
            />
          </div>

          {/* Answer Type */}
          <div className="input-group">
            <label>Question Type</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--space-3)',
              }}
            >
              {QUESTION_TYPE_LIST.map((type) => {
                const Icon = ICONS[type.icon];
                const isSelected = answerType === type.value;

                return (
                  <div
                    key={type.value}
                    className={`radio-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => !saving && setAnswerType(type.value)}
                    id={`manual-type-${type.value.toLowerCase()}`}
                    style={{ opacity: saving ? 0.6 : 1 }}
                  >
                    <input
                      type="radio"
                      name="answerType"
                      checked={isSelected}
                      onChange={() => setAnswerType(type.value)}
                      disabled={saving}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {Icon && <Icon size={14} />}
                        <span
                          style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 'var(--weight-medium)',
                          }}
                        >
                          {type.label}
                        </span>
                      </div>
                      <span
                        style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}
                      >
                        {type.description}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Answer Config */}
          {answerType === 'MULTIPLE_CHOICE' && (
            <div className="input-group">
              <label>Options & Correct Answer</label>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--neutral-400)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Add options, enter option text, and select the radio button next to the
                correct answer.
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                {options.map((option, index) => (
                  <div
                    key={index}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
                  >
                    <input
                      type="radio"
                      name="mc-correct-answer"
                      checked={correctIndex === index}
                      onChange={() => setCorrectIndex(index)}
                      disabled={saving}
                      title="Mark as correct option"
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
                        title="Remove option"
                        disabled={saving}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddOption}
                  disabled={saving}
                >
                  <Plus size={14} /> Add Option
                </button>
              </div>
            </div>
          )}

          {answerType === 'CHECKBOX' && (
            <div className="input-group">
              <label>Options & Correct Answers</label>
              <p
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--neutral-400)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Add options, enter option text, and select the checkboxes next to the
                correct answers.
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                }}
              >
                {options.map((option, index) => (
                  <div
                    key={index}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
                  >
                    <input
                      type="checkbox"
                      checked={correctIndices.includes(index)}
                      onChange={() => handleCheckboxToggle(index)}
                      disabled={saving}
                      title="Mark as correct option"
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
                        title="Remove option"
                        disabled={saving}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddOption}
                  disabled={saving}
                >
                  <Plus size={14} /> Add Option
                </button>
              </div>
            </div>
          )}

          {answerType === 'SHORT_ANSWER' && (
            <div className="input-group">
              <label htmlFor="short-answer-input">Correct Answer</label>
              <input
                type="text"
                id="short-answer-input"
                value={shortAnswerText}
                onChange={(e) => setShortAnswerText(e.target.value)}
                placeholder="Enter the expected short answer..."
                disabled={saving}
                required
              />
            </div>
          )}

          {answerType === 'LONG_ANSWER' && (
            <div className="input-group">
              <label htmlFor="long-answer-textarea">Model / Sample Answer</label>
              <textarea
                id="long-answer-textarea"
                value={longAnswerText}
                onChange={(e) => setLongAnswerText(e.target.value)}
                placeholder="Enter a model answer or grading criteria guidelines..."
                style={{ minHeight: '120px' }}
                disabled={saving}
                required
              />
            </div>
          )}

          {/* Tags Input */}
          <TagInput
            tags={tags}
            onChange={setTags}
            placeholder="Add tags to organize this question..."
            disabled={saving}
          />

          {/* Explanation */}
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              💡 Explanation <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)', fontWeight: 'normal' }}>(optional — shown after the answer is revealed in practice)</span>
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why the correct answer is right, and what makes the other options incorrect..."
              disabled={saving}
              rows={3}
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          onClick={() => navigate('/')}
          disabled={saving || creatingCategory}
          id="btn-manual-cancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={saving || creatingCategory}
          id="btn-manual-save"
        >
          {saving || creatingCategory ? (
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
              <Save size={18} /> Save Question
            </>
          )}
        </button>
      </div>
    </form>
  );
}
