import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  HelpCircle,
  Edit3,
  Trash2,
  Plus,
  Search,
  FolderOpen,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import EditQuestionModal from '../components/EditQuestionModal';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { useQuestions } from '../hooks/useQuestions';
import { useCategories } from '../hooks/useCategories';
import { ANSWER_TYPE_COLORS, QUESTION_TYPES } from '../lib/constants';
import toast from 'react-hot-toast';

export default function CategoryDetailPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const {
    saving,
    fetchQuestionsByCategory,
    updateQuestion,
    deleteQuestion,
    generateExplanation,
  } = useQuestions();

  const { categories } = useCategories();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const category = categories.find((c) => c.id === categoryId);

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchQuestionsByCategory(categoryId);
      setQuestions(data);
    } catch (err) {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [categoryId, fetchQuestionsByCategory]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleEdit = (question) => {
    setEditingQuestion(question);
  };

  const handleSaveEdit = async (updates) => {
    try {
      await updateQuestion(editingQuestion.id, updates);
      toast.success('Question updated!');
      setEditingQuestion(null);
      await loadQuestions();
    } catch (err) {
      toast.error(err.message || 'Failed to update question');
    }
  };

  const handleDelete = async (questionId) => {
    if (confirmDeleteId === questionId) {
      try {
        await deleteQuestion(questionId);
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
        setConfirmDeleteId(null);
        toast.success('Question deleted');
      } catch (err) {
        toast.error(err.message || 'Failed to delete question');
      }
    } else {
      setConfirmDeleteId(questionId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.question_text.toLowerCase().includes(query) ||
      (q.correct_answers || []).some((a) => a.toLowerCase().includes(query)) ||
      (q.tags || []).some((t) => t.toLowerCase().includes(query))
    );
  });

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="container">
          {/* Header */}
          <div className="page-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => navigate('/categories')}
                title="Back to categories"
                id="btn-back-categories"
              >
                <ArrowLeft size={20} />
              </button>
              <div
                style={{
                  width: '40px',
                  height: '40px',
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
              <div>
                <h1 id="category-detail-title" style={{ fontSize: 'var(--text-2xl)' }}>
                  {category?.name || 'Category'}
                </h1>
                <p style={{ fontSize: 'var(--text-sm)' }}>
                  {questions.length} {questions.length === 1 ? 'question' : 'questions'}
                </p>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-6)',
              gap: 'var(--space-4)',
              flexWrap: 'wrap',
            }}
          >
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--neutral-400)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions..."
                style={{ paddingLeft: '36px' }}
                id="search-questions-input"
              />
            </div>

            <Link
              to="/generate"
              className="btn btn-primary"
              id="btn-add-question-to-category"
            >
              <Plus size={16} /> Add Question
            </Link>
          </div>

          {/* Questions List */}
          {loading ? (
            <LoadingSpinner text="Loading questions..." />
          ) : questions.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No questions yet"
              description="This category doesn't have any questions. Create some manually or generate them with AI."
              action={
                <Link to="/generate" className="btn btn-primary">
                  <Plus size={16} /> Create Questions
                </Link>
              }
            />
          ) : filteredQuestions.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matching questions"
              description={`No questions match "${searchQuery}". Try a different search term.`}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {filteredQuestions.map((q, i) => {
                const badgeColor = ANSWER_TYPE_COLORS[q.answer_type] || 'neutral';
                const typeLabel = QUESTION_TYPES[q.answer_type]?.label || q.answer_type;
                const isConfirmingDelete = confirmDeleteId === q.id;

                return (
                  <div
                    key={q.id}
                    className={`card animate-in stagger-${Math.min(i + 1, 6)}`}
                    style={{ padding: 'var(--space-4) var(--space-5)' }}
                    id={`saved-question-${q.id}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                      {/* Question content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                          <span className={`badge badge-${badgeColor}`}>{typeLabel}</span>
                          {q.last_practiced_at != null && (
                            q.current_score >= 80 ? (
                              <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>Score: {q.current_score}%</span>
                            ) : q.current_score >= 50 ? (
                              <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px' }}>Score: {q.current_score}%</span>
                            ) : (
                              <span className="badge badge-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>Score: {q.current_score}%</span>
                            )
                          )}
                          {(q.tags || []).slice(0, 3).map((tag) => (
                            <Link to="/tags" key={tag} style={{ textDecoration: 'none' }}>
                              <span className="badge badge-neutral badge-interactive" style={{ cursor: 'pointer' }}>#{tag}</span>
                            </Link>
                          ))}
                          {(q.tags || []).length > 3 && (
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
                              +{q.tags.length - 3} more
                            </span>
                          )}
                        </div>

                        <p
                          style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--neutral-800)',
                            marginBottom: 'var(--space-2)',
                            lineHeight: 'var(--leading-relaxed)',
                          }}
                        >
                          {q.question_text}
                        </p>

                        {/* Answer preview */}
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)' }}>
                          <strong>Answer:</strong>{' '}
                          {(q.correct_answers || []).join(', ')}
                          {q.incorrect_options && q.incorrect_options.length > 0 && (
                            <span style={{ color: 'var(--neutral-400)' }}>
                              {' '}· Options: {q.incorrect_options.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => handleEdit(q)}
                          title="Edit question"
                          id={`btn-edit-question-${q.id}`}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className={`btn btn-ghost btn-icon`}
                          onClick={() => handleDelete(q.id)}
                          title={isConfirmingDelete ? 'Click again to confirm' : 'Delete question'}
                          style={isConfirmingDelete ? { color: 'var(--danger-500)' } : {}}
                          id={`btn-delete-question-${q.id}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          saving={saving}
          onSave={handleSaveEdit}
          onClose={() => setEditingQuestion(null)}
          onDelete={async (questionId) => {
            try {
              await deleteQuestion(questionId);
              setQuestions((prev) => prev.filter((q) => q.id !== questionId));
              toast.success('Question deleted');
            } catch (err) {
              toast.error(err.message || 'Failed to delete question');
              throw err;
            }
          }}
          generateExplanation={generateExplanation}
        />
      )}
    </>
  );
}
