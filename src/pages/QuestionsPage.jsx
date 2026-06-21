import { useState, useEffect, useCallback } from 'react';
import { HelpCircle, Edit3, Trash2, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import EditQuestionModal from '../components/EditQuestionModal';
import { useQuestions } from '../hooks/useQuestions';
import { ANSWER_TYPE_COLORS, QUESTION_TYPES } from '../lib/constants';
import toast from 'react-hot-toast';

export default function QuestionsPage() {
  const {
    saving,
    fetchAllQuestions,
    updateQuestion,
    deleteQuestion,
  } = useQuestions();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchAllQuestions();
      setQuestions(data);
    } catch (err) {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  }, [fetchAllQuestions]);

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
      (q.category_name || '').toLowerCase().includes(query) ||
      (q.tags || []).some((t) => t.toLowerCase().includes(query)) ||
      (q.correct_answers || []).some((a) => a.toLowerCase().includes(query))
    );
  });

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="container" style={{ maxWidth: '1200px' }}>
          {/* Header */}
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 id="questions-title">Questions Management</h1>
              <p>View, edit, and manage all your generated and manual questions.</p>
            </div>
            <Link to="/generate" className="btn btn-primary">
              <Plus size={16} /> New Question
            </Link>
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
                placeholder="Search questions by text, tag, category..."
                style={{ paddingLeft: '36px', width: '100%' }}
                id="search-all-questions-input"
              />
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>
              Showing {filteredQuestions.length} of {questions.length} questions
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <LoadingSpinner text="Loading questions..." />
          ) : questions.length === 0 ? (
            <EmptyState
              icon={HelpCircle}
              title="No questions yet"
              description="You haven't created any questions yet. Start by generating some with AI or adding them manually."
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
            <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--border-light)' }}>
                    <tr>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)' }}>Question</th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '20%' }}>Correct Answer</th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '10%' }}>Score</th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '12%' }}>Created At</th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '12%' }}>Updated At</th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '10%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((q) => (
                      <tr key={q.id} style={{ borderBottom: '1px solid var(--border-light)', ':hover': { backgroundColor: 'var(--neutral-50)' } }}>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top' }}>
                          <div style={{ marginBottom: 'var(--space-1)', color: 'var(--neutral-900)', fontWeight: 'var(--weight-medium)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {q.question_text}
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className={`badge badge-${ANSWER_TYPE_COLORS[q.answer_type] || 'neutral'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {QUESTION_TYPES[q.answer_type]?.label || q.answer_type}
                            </span>
                            {q.category_name && (
                              <span style={{ fontSize: '11px', color: 'var(--neutral-500)' }}>📁 {q.category_name}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top', color: 'var(--success-700)', fontSize: 'var(--text-sm)' }}>
                          {(q.correct_answers || []).join(', ')}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top', fontSize: 'var(--text-sm)' }}>
                          {q.current_score != null ? `${q.current_score}%` : '—'}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top', fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>
                          {new Date(q.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top', fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>
                          {new Date(q.updated_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleEdit(q)}
                              title="Edit question"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleDelete(q.id)}
                              title={confirmDeleteId === q.id ? 'Click again to confirm' : 'Delete question'}
                              style={confirmDeleteId === q.id ? { color: 'var(--danger-500)' } : {}}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
        />
      )}
    </>
  );
}
