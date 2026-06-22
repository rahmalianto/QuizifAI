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
  Plus,
  ImagePlus,
  BookOpen,
  FileText,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import FileUpload from '../components/FileUpload';
import QuestionTypeSelector from '../components/QuestionTypeSelector';
import TagInput from '../components/TagInput';
import QuestionCard from '../components/QuestionCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ManualQuestionForm from '../components/ManualQuestionForm';
import ImageUpload from '../components/ImageUpload';
import QuestionApprovalFlow from '../components/QuestionApprovalFlow';
import OneNoteBrowser from '../components/OneNoteBrowser';
import { useQuestions } from '../hooks/useQuestions';
import { useCategories } from '../hooks/useCategories';
import { useAuth } from '../hooks/useAuth';
import {
  DEFAULT_QUESTION_COUNT,
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  QUESTION_TYPE_LIST,
} from '../lib/constants';
import toast from 'react-hot-toast';

const STEPS_TEXT = [
  { label: 'Upload', icon: Upload },
  { label: 'Configure', icon: Settings },
  { label: 'Review', icon: CheckCircle },
];

const STEPS_IMAGE = [
  { label: 'Configure', icon: Settings },
  { label: 'Upload Image', icon: ImagePlus },
  { label: 'Review', icon: CheckCircle },
];

const STEPS_ONENOTE = [
  { label: 'Notebook', icon: BookOpen },
  { label: 'Pages', icon: FileText },
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
    generateQuestionsFromImage,
    updateGeneratedQuestion,
    toggleQuestionInclusion,
    removeGeneratedQuestion,
    setAllInclusion,
    setGeneratedQuestions,
    saveQuestions,
    clearGenerated,
  } = useQuestions();

  const { categories, createCategory } = useCategories();
  const { connectMicrosoft, providerToken } = useAuth();

  const [mode, setMode] = useState('ai'); // 'ai', 'image', 'onenote', or 'manual'
  const [step, setStep] = useState(0);

  // Text mode — Step 1 state
  const [rawText, setRawText] = useState('');
  const [inputMode, setInputMode] = useState('paste'); // 'paste' or 'upload'

  // Shared config state (Step 2 for text, Step 1 for image)
  const [selectedTypes, setSelectedTypes] = useState(
    QUESTION_TYPE_LIST.map((t) => t.value)
  );
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT);
  const [tags, setTags] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  // Image mode state
  const [imageData, setImageData] = useState(null); // { base64, mimeType }
  const [imagePrompt, setImagePrompt] = useState('');

  // OneNote mode state
  const [oneNoteConnected, setOneNoteConnected] = useState(false);
  const [oneNoteSelectedPages, setOneNoteSelectedPages] = useState([]);
  const [oneNoteText, setOneNoteText] = useState('');
  const [oneNotePreviewOpen, setOneNotePreviewOpen] = useState(false);
  const [oneNoteCanProceed, setOneNoteCanProceed] = useState(false);
  const [oneNoteFetchingContent, setOneNoteFetchingContent] = useState(false);

  // Pre-select first category
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Auto-detect OneNote connection after OAuth redirect
  useEffect(() => {
    if (providerToken) {
      setOneNoteConnected(true);
      // If returning from OAuth redirect, auto-switch to OneNote mode
      if (mode !== 'onenote') {
        setMode('onenote');
        setStep(0);
      }
    }
  }, [providerToken]);

  const handleTextFromFile = (text) => {
    setRawText(text);
    setInputMode('upload');
  };

  const canProceedStep1Text = rawText.trim().length > 0;
  const canProceedConfig = selectedTypes.length > 0 && (selectedCategoryId || newCategoryName.trim());
  const canProceedStep2Image = imageData !== null;

  const ensureCategoryId = async () => {
    let categoryId = selectedCategoryId;
    if (!categoryId && newCategoryName.trim()) {
      setCreatingCategory(true);
      const newCat = await createCategory(newCategoryName.trim());
      categoryId = newCat.id;
      setSelectedCategoryId(categoryId);
      setCreatingCategory(false);
    }
    return categoryId;
  };

  // Text-based generation
  const handleGenerate = async () => {
    try {
      const categoryId = await ensureCategoryId();
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
      setStep(1); // revert back to config
    }
  };

  // Image-based generation
  const handleGenerateFromImage = async () => {
    try {
      const categoryId = await ensureCategoryId();
      if (!categoryId) {
        toast.error('Please select or create a category');
        return;
      }

      if (!imageData) {
        toast.error('Please upload or paste an image');
        return;
      }

      setStep(2);

      await generateQuestionsFromImage({
        imageBase64: imageData.base64,
        mimeType: imageData.mimeType,
        questionTypes: selectedTypes,
        count: questionCount,
        tags,
        prompt: imagePrompt.trim(),
      });
    } catch (err) {
      toast.error(err.message || 'Failed to generate questions from image');
      setStep(1); // revert back to config
    }
  };

  // OneNote-based generation
  const handleGenerateFromOneNote = async () => {
    try {
      const categoryId = await ensureCategoryId();
      if (!categoryId) {
        toast.error('Please select or create a category');
        return;
      }

      if (!oneNoteText.trim()) {
        toast.error('No text content extracted from selected pages');
        return;
      }

      setStep(3);

      await generateQuestions({
        text: oneNoteText,
        questionTypes: selectedTypes,
        count: questionCount,
        tags,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to generate questions from OneNote');
      setStep(2); // revert back to config
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

  // Image mode: save only approved questions
  const handleSaveApproved = async () => {
    try {
      // Mark approved as _included = true for saveQuestions, and remove rejected
      const approved = generatedQuestions.filter((q) => q._included === true);
      if (approved.length === 0) {
        toast.error('No approved questions to save');
        return;
      }
      // Temporarily set generatedQuestions to only approved ones with _included: true
      setGeneratedQuestions(approved.map((q) => ({ ...q, _included: true })));

      // Small delay to let state update
      await new Promise((r) => setTimeout(r, 50));

      const result = await saveQuestions(selectedCategoryId);
      toast.success(`Saved ${result.length} questions!`);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Failed to save questions');
    }
  };

  // Image mode approval callbacks
  const handleApproveQuestion = (tempId) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q._tempId === tempId ? { ...q, _included: true } : q))
    );
  };

  const handleRejectQuestion = (tempId) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q._tempId === tempId ? { ...q, _included: false } : q))
    );
  };

  const handleEditQuestion = (tempId, updates) => {
    updateGeneratedQuestion(tempId, updates);
  };

  const includedCount = generatedQuestions.filter((q) => q._included).length;

  const currentSteps = mode === 'onenote' ? STEPS_ONENOTE : mode === 'image' ? STEPS_IMAGE : STEPS_TEXT;

  // Shared config card (used by both text Step 2 and image Step 1)
  const renderConfigCard = () => (
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
  );

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="container" style={{ maxWidth: '800px' }}>
          {/* Page Header */}
          <div className="page-header" style={{ textAlign: 'center' }}>
            <h1 id="generate-title">
              {mode === 'ai'
                ? 'Generate with AI'
                : mode === 'image'
                ? 'Generate from Image'
                : mode === 'onenote'
                ? 'Generate from OneNote'
                : 'Create Manually'}
            </h1>
            <p>
              {mode === 'ai'
                ? 'Upload your study material and let AI create quiz questions'
                : mode === 'image'
                ? 'Upload or paste an image and let AI generate questions from it'
                : mode === 'onenote'
                ? 'Connect your OneNote and generate questions from your notebook pages'
                : 'Write your own question, options, and answers'}
            </p>
          </div>

          {/* Mode Selector Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-8)' }}>
            <div style={{
              display: 'flex',
              background: 'var(--neutral-100)',
              borderRadius: 'var(--radius-lg)',
              padding: '4px',
              border: 'var(--border-light)'
            }}>
              <button
                className={`btn ${mode === 'ai' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-4)' }}
                onClick={() => { setMode('ai'); setStep(0); clearGenerated(); }}
                id="tab-mode-ai"
              >
                <Sparkles size={16} /> AI (Text)
              </button>
              <button
                className={`btn ${mode === 'image' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-4)' }}
                onClick={() => { setMode('image'); setStep(0); clearGenerated(); setImageData(null); }}
                id="tab-mode-image"
              >
                <ImagePlus size={16} /> AI (Image)
              </button>
              <button
                className={`btn ${mode === 'onenote' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-4)' }}
                onClick={() => { setMode('onenote'); setStep(0); clearGenerated(); setOneNoteSelectedPages([]); setOneNoteText(''); }}
                id="tab-mode-onenote"
              >
                <BookOpen size={16} /> OneNote
              </button>
              <button
                className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-4)' }}
                onClick={() => { setMode('manual'); setStep(0); clearGenerated(); }}
                id="tab-mode-manual"
              >
                <Plus size={16} /> Manual
              </button>
            </div>
          </div>

          {mode === 'manual' ? (
            <ManualQuestionForm categories={categories} createCategory={createCategory} />
          ) : (
            <>
              {/* Steps Indicator */}
              <div className="steps-indicator">
                {currentSteps.map((s, i) => (
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
                    {i < currentSteps.length - 1 && (
                      <div className={`step-connector ${i < step ? 'completed' : ''}`}></div>
                    )}
                  </div>
                ))}
              </div>

              {/* ========== TEXT MODE ========== */}
              {mode === 'ai' && (
                <>
                  {/* Step 1: Upload / Paste Text */}
                  {step === 0 && (
                    <div className="animate-in">
                      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
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
                          disabled={!canProceedStep1Text}
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
                      {renderConfigCard()}

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
                          disabled={!canProceedConfig || generating || creatingCategory}
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

                  {/* Step 3: Review & Save (batch) */}
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
                </>
              )}

              {/* ========== IMAGE MODE ========== */}
              {mode === 'image' && (
                <>
                  {/* Step 1: Configure */}
                  {step === 0 && (
                    <div className="animate-in">
                      {renderConfigCard()}

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-primary btn-lg"
                          disabled={!canProceedConfig}
                          onClick={() => setStep(1)}
                          id="btn-image-step1-next"
                        >
                          Continue <ArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Upload Image */}
                  {step === 1 && (
                    <div className="animate-in">
                      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                        <h3 style={{ marginBottom: 'var(--space-4)' }}>Upload or Paste Image</h3>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-600)', marginBottom: 'var(--space-4)' }}>
                          Take a screenshot of your study material and press <strong>Ctrl+V</strong> to paste it, 
                          or drag and drop an image file below.
                        </p>
                        <ImageUpload onImageReady={setImageData} />

                        <div className="input-group" style={{ marginTop: 'var(--space-6)' }}>
                          <label htmlFor="image-prompt-input">
                            Additional Context (Optional)
                          </label>
                          <textarea
                            id="image-prompt-input"
                            value={imagePrompt}
                            onChange={(e) => setImagePrompt(e.target.value)}
                            placeholder="Add any specific instructions for the AI (e.g., 'Focus only on the bold text', 'Translate these questions to Spanish')"
                            style={{ minHeight: '80px' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button
                          className="btn btn-secondary btn-lg"
                          onClick={() => setStep(0)}
                          id="btn-image-step2-back"
                        >
                          <ArrowLeft size={18} /> Back
                        </button>
                        <button
                          className="btn btn-primary btn-lg"
                          disabled={!canProceedStep2Image || generating || creatingCategory}
                          onClick={handleGenerateFromImage}
                          id="btn-generate-from-image"
                        >
                          {generating || creatingCategory ? (
                            <>
                              <div className="spinner">
                                <div className="spinner-circle" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                              </div>
                              {creatingCategory ? 'Creating category...' : 'Analyzing image...'}
                            </>
                          ) : (
                            <>
                              <Sparkles size={18} /> Generate from Image
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3: One-by-one review */}
                  {step === 2 && (
                    <div className="animate-in">
                      {generating ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
                          <LoadingSpinner size="lg" text="AI is analyzing your image and generating questions..." />
                          <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--neutral-400)' }}>
                            This may take 15–45 seconds depending on the image complexity
                          </p>
                        </div>
                      ) : generatedQuestions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
                          <p style={{ color: 'var(--neutral-500)', marginBottom: 'var(--space-4)' }}>
                            No questions were generated. The image may not contain enough readable content.
                          </p>
                          <button
                            className="btn btn-secondary"
                            onClick={() => { setStep(1); setImageData(null); }}
                            id="btn-back-to-image-upload"
                          >
                            <ArrowLeft size={16} /> Try Another Image
                          </button>
                        </div>
                      ) : (
                        <QuestionApprovalFlow
                          questions={generatedQuestions}
                          onApprove={handleApproveQuestion}
                          onReject={handleRejectQuestion}
                          onEdit={handleEditQuestion}
                          onSave={handleSaveApproved}
                          saving={saving}
                        />
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ========== ONENOTE MODE ========== */}
              {mode === 'onenote' && (
                <>
                  {/* Not connected — show Connect button */}
                  {!oneNoteConnected || !providerToken ? (
                    <div className="animate-in">
                      <div
                        className="card"
                        style={{
                          textAlign: 'center',
                          padding: 'var(--space-12) var(--space-8)',
                        }}
                      >
                        <div
                          style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.15))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto var(--space-5)',
                          }}
                        >
                          <BookOpen size={32} style={{ color: 'var(--primary)' }} />
                        </div>
                        <h3 style={{ marginBottom: 'var(--space-2)' }}>
                          Connect Your OneNote
                        </h3>
                        <p
                          style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--neutral-500)',
                            marginBottom: 'var(--space-6)',
                            maxWidth: '420px',
                            margin: '0 auto var(--space-6)',
                          }}
                        >
                          Sign in with your Microsoft account to browse your
                          OneNote notebooks and generate questions from your
                          study notes.
                        </p>
                        <button
                          className="btn btn-primary btn-lg"
                          onClick={() => {
                            connectMicrosoft('/generate').catch((err) => {
                              toast.error(
                                `Failed to connect: ${err.message}`
                              );
                            });
                          }}
                          id="btn-connect-onenote"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                          }}
                        >
                          <BookOpen size={18} />
                          Connect OneNote
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Single persistent OneNoteBrowser for steps 0 & 1 */}
                      <div style={{ display: (step === 0 || step === 1) ? 'block' : 'none' }}>
                        <OneNoteBrowser
                          accessToken={providerToken}
                          step={step}
                          onSelectionChange={() => {}}
                          onPagesContentReady={(text) => {
                            if (!text || text.trim().length === 0) {
                              toast.error('No text could be extracted from the selected pages.');
                            } else {
                              toast.success(`Extracted ${text.length} characters.`);
                            }
                            setOneNoteText(text);
                            setOneNoteFetchingContent(false);
                            setStep(2);
                          }}
                          onCanProceedChange={setOneNoteCanProceed}
                        />
                      </div>

                      {/* Step 0: Navigation buttons */}
                      {step === 0 && (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            className="btn btn-primary btn-lg"
                            disabled={!oneNoteCanProceed}
                            onClick={() => setStep(1)}
                            id="btn-onenote-step0-next"
                          >
                            Continue <ArrowRight size={18} />
                          </button>
                        </div>
                      )}

                      {/* Step 1: Navigation buttons */}
                      {step === 1 && (
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <button
                            className="btn btn-secondary btn-lg"
                            onClick={() => setStep(0)}
                            id="btn-onenote-step1-back"
                          >
                            <ArrowLeft size={18} /> Back
                          </button>
                          <button
                            className="btn btn-primary btn-lg"
                            disabled={!oneNoteCanProceed || oneNoteFetchingContent}
                            onClick={() => {
                              // Trigger content fetching — the browser component
                              // will call onPagesContentReady when done
                              setOneNoteFetchingContent(true);
                              // We need to access the browser's fetch function
                              // So we trigger it via the exposed callback pattern
                              const event = new CustomEvent('onenote-fetch-content');
                              window.dispatchEvent(event);
                            }}
                            id="btn-onenote-step1-next"
                          >
                            {oneNoteFetchingContent ? (
                              <>
                                <div className="spinner">
                                  <div className="spinner-circle" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                                </div>
                                Fetching content...
                              </>
                            ) : (
                              <>
                                Continue <ArrowRight size={18} />
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Step 2: Configure + Text Preview */}
                      {step === 2 && (
                        <div className="animate-in">
                          {renderConfigCard()}

                          {/* Collapsible text preview */}
                          {oneNoteText && (
                            <div
                              className="card"
                              style={{ marginBottom: 'var(--space-6)' }}
                            >
                              <button
                                onClick={() =>
                                  setOneNotePreviewOpen(!oneNotePreviewOpen)
                                }
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'var(--space-2)',
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: 0,
                                  fontSize: 'var(--text-sm)',
                                  fontWeight: 'var(--weight-semibold)',
                                  color: 'var(--neutral-700)',
                                  width: '100%',
                                }}
                                id="btn-onenote-preview-toggle"
                              >
                                {oneNotePreviewOpen ? (
                                  <ChevronDown size={16} />
                                ) : (
                                  <ChevronRight size={16} />
                                )}
                                Preview Extracted Text
                                <span
                                  style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--neutral-400)',
                                    fontWeight: 'var(--weight-normal)',
                                    marginLeft: 'auto',
                                  }}
                                >
                                  {oneNoteText.length.toLocaleString()} characters
                                </span>
                              </button>
                              {oneNotePreviewOpen && (
                                <div
                                  style={{
                                    marginTop: 'var(--space-3)',
                                    padding: 'var(--space-4)',
                                    background: 'var(--neutral-50)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--neutral-200)',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--neutral-600)',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    lineHeight: '1.6',
                                  }}
                                >
                                  {oneNoteText}
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <button
                              className="btn btn-secondary btn-lg"
                              onClick={() => setStep(1)}
                              id="btn-onenote-step2-back"
                            >
                              <ArrowLeft size={18} /> Back
                            </button>
                            <button
                              className="btn btn-primary btn-lg"
                              disabled={
                                !canProceedConfig ||
                                generating ||
                                creatingCategory ||
                                !oneNoteText.trim()
                              }
                              onClick={handleGenerateFromOneNote}
                              id="btn-generate-from-onenote"
                            >
                              {generating || creatingCategory ? (
                                <>
                                  <div className="spinner">
                                    <div
                                      className="spinner-circle"
                                      style={{
                                        width: '18px',
                                        height: '18px',
                                        borderWidth: '2px',
                                      }}
                                    ></div>
                                  </div>
                                  {creatingCategory
                                    ? 'Creating category...'
                                    : 'Generating...'}
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

                      {/* Step 3: Review & Save (batch — same as Text mode) */}
                      {step === 3 && (
                        <div className="animate-in">
                          {generating ? (
                            <div
                              style={{
                                textAlign: 'center',
                                padding: 'var(--space-16) 0',
                              }}
                            >
                              <LoadingSpinner
                                size="lg"
                                text="AI is generating questions from your OneNote pages..."
                              />
                              <p
                                style={{
                                  marginTop: 'var(--space-4)',
                                  fontSize: 'var(--text-sm)',
                                  color: 'var(--neutral-400)',
                                }}
                              >
                                This usually takes 10–30 seconds depending on
                                the amount of content
                              </p>
                            </div>
                          ) : generatedQuestions.length === 0 ? (
                            <div
                              style={{
                                textAlign: 'center',
                                padding: 'var(--space-16) 0',
                              }}
                            >
                              <p
                                style={{
                                  color: 'var(--neutral-500)',
                                  marginBottom: 'var(--space-4)',
                                }}
                              >
                                No questions were generated. Try selecting
                                different pages or adjusting your settings.
                              </p>
                              <button
                                className="btn btn-secondary"
                                onClick={() => setStep(2)}
                                id="btn-onenote-back-to-configure"
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
                                  <h4
                                    style={{
                                      marginBottom: 'var(--space-1)',
                                    }}
                                  >
                                    {generatedQuestions.length} Questions
                                    Generated
                                  </h4>
                                  <p style={{ fontSize: 'var(--text-sm)' }}>
                                    {includedCount} selected for saving
                                  </p>
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: 'var(--space-2)',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setAllInclusion(true)}
                                    id="btn-onenote-include-all"
                                  >
                                    <Eye size={14} /> Include All
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setAllInclusion(false)}
                                    id="btn-onenote-exclude-all"
                                  >
                                    <EyeOff size={14} /> Exclude All
                                  </button>
                                </div>
                              </div>

                              {/* Question Cards */}
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 'var(--space-4)',
                                  marginBottom: 'var(--space-8)',
                                }}
                              >
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
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <button
                                  className="btn btn-secondary"
                                  onClick={() => {
                                    clearGenerated();
                                    setStep(2);
                                  }}
                                  id="btn-onenote-discard"
                                >
                                  <Trash2 size={16} /> Discard & Reconfigure
                                </button>
                                <button
                                  className="btn btn-primary btn-lg"
                                  disabled={
                                    saving || includedCount === 0
                                  }
                                  onClick={handleSave}
                                  id="btn-onenote-save"
                                >
                                  {saving ? (
                                    <>
                                      <div className="spinner">
                                        <div
                                          className="spinner-circle"
                                          style={{
                                            width: '18px',
                                            height: '18px',
                                            borderWidth: '2px',
                                          }}
                                        ></div>
                                      </div>
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Save size={18} /> Save{' '}
                                      {includedCount} Questions
                                    </>
                                  )}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
