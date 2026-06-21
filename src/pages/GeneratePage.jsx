import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Settings,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import FileUpload from '../components/FileUpload';
import QuestionTypeSelector from '../components/QuestionTypeSelector';
import TagInput from '../components/TagInput';
import QuestionCard from '../components/QuestionCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useQuestions } from '../hooks/useQuestions';
import { useCategories } from '../hooks/useCategories';
import {
  DEFAULT_QUESTION_COUNT,
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  QUESTION_TYPE_LIST,
} from '../lib/constants';
import toast from 'react-hot-toast';

const STEPS = [
  { label: 'Upload', icon: Upload },
  { label: 'Configure', icon: Settings },
  { label: 'Review', icon: CheckCircle },
];

export default function GeneratePage() {
  const navigate = useNavigate();
  const {
    generatedQuestions,
    generating,
    saving,
    generateQuestions,
    updateGeneratedQuestion,
    toggleQuestionInclusion,
    removeGeneratedQuestion,
    setAllInclusion,
    saveQuestions,
    clearGenerated,
  } = useQuestions();

  const { categories, createCategory } = useCategories();

  const [step, setStep] = useState(0);

  // Step 1 state
  const [rawText, setRawText] = useState('');
  const [inputMode, setInputMode] = useState('paste'); // 'paste' or 'upload'

  // Step 2 state
  const [selectedTypes, setSelectedTypes] = useState(
    QUESTION_TYPE_LIST.map((t) => t.value)
  );
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);
  const [tags, setTags] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Pre-select first category
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const handleTextFromFile = (text) => {
    setRawText(text);
    setInputMode('upload');
  };

  const canProceedStep1 = rawText.trim().length > 0;
  const canProceedStep2 = selectedTypes.length > 0 && (selectedCategoryId || newCategoryName.trim());

  const handleGenerate = async () => {
    try {
      // Create new category if needed
      let categoryId = selectedCategoryId;
      if (!categoryId && newCategoryName.trim()) {
        setCreatingCategory(true);
        const newCat = await createCategory(newCategoryName.trim());
        categoryId = newCat.id;
        setSelectedCategoryId(categoryId);
        setCreatingCategory(false);
      }

      if (!categoryId) {
        toast.error('Please select or create a category');
        return;
      }

      setStep(2);

      await generateQuestions({
        text: rawText,
        questionTypes: selectedTypes,
        count: questionCount,
        tags,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to generate questions');
    }
  };

  const handleSave = async () => {
    try {
      const result = await saveQuestions(selectedCategoryId);
      toast.success(`Saved ${result.length} questions!`);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Failed to save questions');
    }
  };

  const includedCount = generatedQuestions.filter((q) => q._included).length;

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="container" style={{ maxWidth: '800px' }}>
          {/* Page Header */}
          <div className="page-header" style={{ textAlign: 'center' }}>
            <h1 id="generate-title">Generate Questions</h1>
            <p>Upload your study material and let AI create quiz questions</p>
          </div>

          {/* Steps Indicator */}
          <div className="steps-indicator">
            {STEPS.map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div className="step-item">
                  <div
                    className={`step-circle ${
                      i === step ? 'active' : i < step ? 'completed' : 'inactive'
                    }`}
                  >
                    {i < step ? (
                      <CheckCircle size={16} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`step-label ${i === step ? 'active' : ''}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`step-connector ${i < step ? 'completed' : ''}`}></div>
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Upload / Paste */}
          {step === 0 && (
            <div className="animate-in">
              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                {/* Toggle between paste and upload */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                  <button
                    className={`btn ${inputMode === 'paste' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setInputMode('paste')}
                    id="btn-input-paste"
                  >
                    Paste Text
                  </button>
                  <button
                    className={`btn ${inputMode === 'upload' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    onClick={() => setInputMode('upload')}
                    id="btn-input-upload"
                  >
                    Upload File
                  </button>
                </div>

                {inputMode === 'paste' ? (
                  <div className="input-group">
                    <label htmlFor="raw-text-input">
                      Paste your study material, notes, or course content
                    </label>
                    <textarea
                      id="raw-text-input"
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Paste your study notes, course material, or any text you want to generate questions from..."
                      style={{ minHeight: '240px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
                        {rawText.length.toLocaleString()} characters
                      </span>
                    </div>
                  </div>
                ) : (
                  <FileUpload onTextExtracted={handleTextFromFile} />
                )}

                {/* Show extracted text preview when uploaded */}
                {inputMode === 'upload' && rawText && (
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--neutral-700)', marginBottom: 'var(--space-2)', display: 'block' }}>
                      Extracted Text Preview
                    </label>
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      style={{ minHeight: '160px' }}
                      id="extracted-text-preview"
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
                        {rawText.length.toLocaleString()} characters — you can edit this before proceeding
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary btn-lg"
                  disabled={!canProceedStep1}
                  onClick={() => setStep(1)}
                  id="btn-step1-next"
                >
                  Continue <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Configure */}
          {step === 1 && (
            <div className="animate-in">
              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  {/* Category Selection */}
                  <div className="input-group">
                    <label htmlFor="category-select">Category</label>
                    <select
                      id="category-select"
                      value={selectedCategoryId}
                      onChange={(e) => {
                        setSelectedCategoryId(e.target.value);
                        if (e.target.value) setNewCategoryName('');
                      }}
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
                      id="new-category-input"
                    />
                  </div>

                  {/* Question Types */}
                  <QuestionTypeSelector
                    selected={selectedTypes}
                    onChange={setSelectedTypes}
                  />

                  {/* Question Count */}
                  <div className="range-group">
                    <div className="range-header">
                      <label>Number of Questions</label>
                      <span className="range-value">{questionCount}</span>
                    </div>
                    <input
                      type="range"
                      min={MIN_QUESTION_COUNT}
                      max={MAX_QUESTION_COUNT}
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                      id="question-count-slider"
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>{MIN_QUESTION_COUNT}</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>{MAX_QUESTION_COUNT}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <TagInput
                    tags={tags}
                    onChange={setTags}
                    placeholder="Add tags to organize these questions..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  className="btn btn-secondary btn-lg"
                  onClick={() => setStep(0)}
                  id="btn-step2-back"
                >
                  <ArrowLeft size={18} /> Back
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  disabled={!canProceedStep2 || generating || creatingCategory}
                  onClick={handleGenerate}
                  id="btn-generate"
                >
                  {generating || creatingCategory ? (
                    <>
                      <div className="spinner">
                        <div className="spinner-circle" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                      </div>
                      {creatingCategory ? 'Creating category...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Generate Questions
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Save */}
          {step === 2 && (
            <div className="animate-in">
              {generating ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
                  <LoadingSpinner size="lg" text="AI is generating your questions..." />
                  <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--neutral-400)' }}>
                    This usually takes 10–30 seconds depending on the amount of content
                  </p>
                </div>
              ) : generatedQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
                  <p style={{ color: 'var(--neutral-500)', marginBottom: 'var(--space-4)' }}>
                    No questions were generated. Try adjusting your settings or providing more content.
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setStep(1)}
                    id="btn-back-to-configure"
                  >
                    <ArrowLeft size={16} /> Back to Configure
                  </button>
                </div>
              ) : (
                <>
                  {/* Review Header */}
                  <div
                    className="card"
                    style={{
                      marginBottom: 'var(--space-6)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div>
                      <h4 style={{ marginBottom: 'var(--space-1)' }}>
                        {generatedQuestions.length} Questions Generated
                      </h4>
                      <p style={{ fontSize: 'var(--text-sm)' }}>
                        {includedCount} selected for saving
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setAllInclusion(true)}
                        id="btn-include-all"
                      >
                        <Eye size={14} /> Include All
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setAllInclusion(false)}
                        id="btn-exclude-all"
                      >
                        <EyeOff size={14} /> Exclude All
                      </button>
                    </div>
                  </div>

                  {/* Question Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
                    {generatedQuestions.map((q, i) => (
                      <QuestionCard
                        key={q._tempId}
                        question={q}
                        index={i}
                        onUpdate={updateGeneratedQuestion}
                        onToggleInclude={toggleQuestionInclusion}
                        onRemove={removeGeneratedQuestion}
                      />
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        clearGenerated();
                        setStep(1);
                      }}
                      id="btn-discard"
                    >
                      <Trash2 size={16} /> Discard & Reconfigure
                    </button>
                    <button
                      className="btn btn-primary btn-lg"
                      disabled={saving || includedCount === 0}
                      onClick={handleSave}
                      id="btn-save-questions"
                    >
                      {saving ? (
                        <>
                          <div className="spinner">
                            <div className="spinner-circle" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                          </div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={18} /> Save {includedCount} Questions
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
