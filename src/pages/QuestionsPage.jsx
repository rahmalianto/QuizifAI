import { useState, useEffect, useCallback } from 'react';
import { HelpCircle, Edit3, Trash2, Plus, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import EditQuestionModal from '../components/EditQuestionModal';
import BulkCategoryModal from '../components/BulkCategoryModal';
import BulkTagsModal from '../components/BulkTagsModal';
import BulkDeleteModal from '../components/BulkDeleteModal';
import { useQuestions } from '../hooks/useQuestions';
import { ANSWER_TYPE_COLORS, QUESTION_TYPES } from '../lib/constants';
import toast from 'react-hot-toast';

export default function QuestionsPage() {
  const {
    saving,
    fetchAllQuestions,
    updateQuestion,
    deleteQuestion,
    bulkUpdateCategory,
    bulkAddTags,
    bulkRemoveTags,
    bulkDeleteQuestions,
  } = useQuestions();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Bulk Actions State
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [bulkModal, setBulkModal] = useState(null); // 'category', 'tags', 'delete'

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

  const handleRowClick = (question, e) => {
    // Ignore clicks on buttons or links
    if (e.target.closest('button') || e.target.closest('a')) return;

    // If click was inside the select column
    if (e.target.closest('.select-column')) {
      // If they didn't click the checkbox itself (which handles its own onChange), manually toggle
      if (!e.target.closest('input[type="checkbox"]')) {
        handleSelectRow(question.id);
      }
      return;
    }

    handleEdit(question);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedQuestionIds(filteredQuestions.map(q => q.id));
    } else {
      setSelectedQuestionIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedQuestionIds(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
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

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Special handling for numeric fields (e.g. current_score)
    if (sortConfig.key === 'current_score') {
      // Treat null (unpracticed) as -1
      const aNum = aValue == null ? -1 : Number(aValue);
      const bNum = bValue == null ? -1 : Number(bValue);
      return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
    }

    // Handle nulls/undefined for correct sorting
    if (aValue == null) aValue = '';
    if (bValue == null) bValue = '';

    // Convert strings to lowercase for case-insensitive sorting
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const isAllSelected = sortedQuestions.length > 0 && selectedQuestionIds.length === sortedQuestions.length;
  const isSomeSelected = selectedQuestionIds.length > 0 && selectedQuestionIds.length < sortedQuestions.length;

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) {
      return <div style={{ width: '14px', height: '14px', display: 'inline-block', marginLeft: '4px' }} />;
    }
    return sortConfig.direction === 'asc' ? 
      <ChevronUp size={14} style={{ display: 'inline', marginLeft: '4px' }} /> : 
      <ChevronDown size={14} style={{ display: 'inline', marginLeft: '4px' }} />;
  };

  const handleBulkCategory = async (categoryId) => {
    try {
      await bulkUpdateCategory(selectedQuestionIds, categoryId);
      toast.success('Questions moved successfully');
      setBulkModal(null);
      setSelectedQuestionIds([]);
      await loadQuestions();
    } catch (err) {
      toast.error(err.message || 'Failed to move questions');
    }
  };

  const handleBulkAddTags = async (tagsToAdd) => {
    try {
      await bulkAddTags(selectedQuestionIds, tagsToAdd);
      toast.success('Tags added successfully');
      setBulkModal(null);
      await loadQuestions();
    } catch (err) {
      toast.error(err.message || 'Failed to add tags');
    }
  };

  const handleBulkRemoveTags = async (tagsToRemove) => {
    try {
      await bulkRemoveTags(selectedQuestionIds, tagsToRemove);
      toast.success('Tags removed successfully');
      setBulkModal(null);
      await loadQuestions();
    } catch (err) {
      toast.error(err.message || 'Failed to remove tags');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDeleteQuestions(selectedQuestionIds);
      toast.success(`${selectedQuestionIds.length} questions deleted`);
      setBulkModal(null);
      setSelectedQuestionIds([]);
      await loadQuestions();
    } catch (err) {
      toast.error(err.message || 'Failed to delete questions');
    }
  };

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
            <div style={{ position: 'relative', flex: 1, maxWidth: '600px', display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
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

              {selectedQuestionIds.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--primary-700)', padding: '0 var(--space-2)' }}>
                    {selectedQuestionIds.length} selected
                  </span>
                  <button className="btn btn-outline btn-sm" onClick={() => setBulkModal('category')}>
                    Move
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setBulkModal('tags')}>
                    Tags
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => setBulkModal('delete')}>
                    Delete
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>
              Showing {sortedQuestions.length} of {questions.length} questions
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
          ) : sortedQuestions.length === 0 ? (
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
                      <th style={{ padding: 'var(--space-3) var(--space-4)', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={input => { if (input) input.indeterminate = isSomeSelected; }}
                          onChange={handleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th 
                        style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('question_text')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>Question <SortIcon columnKey="question_text" /></div>
                      </th>
                      <th 
                        style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '20%', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('correct_answers')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>Correct Answer <SortIcon columnKey="correct_answers" /></div>
                      </th>
                      <th 
                        style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '10%', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('current_score')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>Score <SortIcon columnKey="current_score" /></div>
                      </th>
                      <th 
                        style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '12%', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('created_at')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>Created At <SortIcon columnKey="created_at" /></div>
                      </th>
                      <th 
                        style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '12%', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => handleSort('updated_at')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>Updated At <SortIcon columnKey="updated_at" /></div>
                      </th>
                      <th style={{ padding: 'var(--space-3) var(--space-4)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)', width: '10%', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedQuestions.map((q) => (
                      <tr 
                        key={q.id} 
                        style={{ borderBottom: '1px solid var(--border-light)', cursor: 'pointer', transition: 'background-color 0.2s', backgroundColor: selectedQuestionIds.includes(q.id) ? 'var(--primary-50)' : 'transparent' }}
                        onClick={(e) => handleRowClick(q, e)}
                        className="table-row-hover"
                      >
                        <td className="select-column" style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedQuestionIds.includes(q.id)}
                            onChange={() => handleSelectRow(q.id)}
                            style={{ cursor: 'pointer', marginTop: '4px' }}
                          />
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top' }}>
                          <div style={{ marginBottom: 'var(--space-1)', color: 'var(--neutral-900)', fontWeight: 'var(--weight-medium)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {q.question_text}
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className={`badge badge-${ANSWER_TYPE_COLORS[q.answer_type] || 'neutral'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                              {QUESTION_TYPES[q.answer_type]?.label || q.answer_type}
                            </span>
                            {q.category_name && q.category_id && (
                              <Link to={`/categories/${q.category_id}`} style={{ textDecoration: 'none' }}>
                                <span className="badge-interactive" style={{ fontSize: '11px', color: 'var(--primary-600)', cursor: 'pointer' }}>📁 {q.category_name}</span>
                              </Link>
                            )}
                            {(q.tags || []).slice(0, 3).map((tag) => (
                              <Link to="/tags" key={tag} style={{ textDecoration: 'none' }}>
                                <span className="badge badge-neutral badge-interactive" style={{ fontSize: '10px', padding: '2px 6px', cursor: 'pointer' }}>#{tag}</span>
                              </Link>
                            ))}
                            {(q.tags || []).length > 3 && (
                              <span style={{ fontSize: '10px', color: 'var(--neutral-400)' }}>
                                +{q.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top', color: 'var(--success-700)', fontSize: 'var(--text-sm)' }}>
                          {(q.correct_answers || []).join(', ')}
                        </td>
                        <td style={{ padding: 'var(--space-3) var(--space-4)', verticalAlign: 'top' }}>
                          {q.last_practiced_at == null ? (
                            <span className="badge badge-neutral" style={{ fontSize: '11px', padding: '2px 8px' }}>—</span>
                          ) : q.current_score >= 80 ? (
                            <span className="badge badge-success" style={{ fontSize: '11px', padding: '2px 8px' }}>{q.current_score}%</span>
                          ) : q.current_score >= 50 ? (
                            <span className="badge badge-warning" style={{ fontSize: '11px', padding: '2px 8px' }}>{q.current_score}%</span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontSize: '11px', padding: '2px 8px' }}>{q.current_score}%</span>
                          )}
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

      {/* Bulk Modals */}
      {bulkModal === 'category' && (
        <BulkCategoryModal
          onClose={() => setBulkModal(null)}
          onConfirm={handleBulkCategory}
        />
      )}
      
      {bulkModal === 'tags' && (
        <BulkTagsModal
          selectedQuestions={questions.filter(q => selectedQuestionIds.includes(q.id))}
          onClose={() => setBulkModal(null)}
          onAddTags={handleBulkAddTags}
          onRemoveTags={handleBulkRemoveTags}
        />
      )}

      {bulkModal === 'delete' && (
        <BulkDeleteModal
          count={selectedQuestionIds.length}
          onClose={() => setBulkModal(null)}
          onConfirm={handleBulkDelete}
        />
      )}
    </>
  );
}
