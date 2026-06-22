import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuestions } from '../hooks/useQuestions';
import { useCategories } from '../hooks/useCategories';
import { useTags } from '../hooks/useTags';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Dices, ArrowRight, CheckCircle, Eye, Settings, Trophy, RotateCcw } from 'lucide-react';

export default function PracticePage() {
  const navigate = useNavigate();
  const { fetchAllQuestions, savePracticeActivity, fetchPracticeConfiguration, savePracticeConfiguration } = useQuestions();
  const { categories, fetchCategories } = useCategories();
  const { tags, fetchTags } = useTags();
  
  // Data state
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Configuration state
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [setAsDefault, setSetAsDefault] = useState(false);

  // Practice flow state
  const [practiceState, setPracticeState] = useState('SETUP'); // 'SETUP' | 'PRACTICING' | 'SUMMARY'
  const [selectedCount, setSelectedCount] = useState(10);
  
  // Session state
  const [sessionQueue, setSessionQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionId, setSessionId] = useState('');

  // Active question state
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [currentOptions, setCurrentOptions] = useState([]);

  // Fetch initial data
  useEffect(() => {
    fetchCategories();
    fetchTags();
  }, [fetchCategories, fetchTags]);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const data = await fetchAllQuestions();
        setAllQuestions(data);
      } catch (err) {
        console.error('Failed to load questions', err);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [fetchAllQuestions]);

  // Fetch default configuration
  useEffect(() => {
    const loadConfig = async () => {
      const conf = await fetchPracticeConfiguration();
      if (conf) {
        if (conf.category && conf.category.length > 0) setSelectedCategories(conf.category);
        if (conf.tag && conf.tag.length > 0) setSelectedTags(conf.tag);
        if (conf.question_count) setSelectedCount(conf.question_count);
      }
    };
    loadConfig();
  }, [fetchPracticeConfiguration]);

  // Dynamically filter questions
  useEffect(() => {
    let filtered = allQuestions;
    if (selectedCategories.length > 0 || selectedTags.length > 0) {
      filtered = allQuestions.filter(q => {
        const matchCat = selectedCategories.length === 0 || selectedCategories.includes(q.category_id);
        const matchTag = selectedTags.length === 0 || (q.tags && q.tags.some(t => selectedTags.includes(t)));
        return matchCat && matchTag; // ANY category AND ANY tag
      });
    }
    setFilteredQuestions(filtered);
    
    // Auto-adjust bounds for slider
    const maxAllowed = Math.min(30, filtered.length);
    if (selectedCount > maxAllowed) {
      setSelectedCount(maxAllowed);
    } else if (filtered.length > 0 && selectedCount === 0) {
      setSelectedCount(Math.min(10, maxAllowed));
    }
  }, [allQuestions, selectedCategories, selectedTags, selectedCount]);

  const toggleCategory = (id) => {
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleTag = (name) => {
    setSelectedTags(prev => prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]);
  };

  const startPractice = async () => {
    if (filteredQuestions.length === 0) return;

    if (setAsDefault) {
      await savePracticeConfiguration(selectedCategories, selectedTags, selectedCount);
      setSetAsDefault(false); // reset checkbox after saving
    }

    // Create a new session
    setSessionId(crypto.randomUUID());
    setSessionScore(0);
    setCurrentQueueIndex(0);

    // Shuffle the filtered pool
    const shuffled = [...filteredQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Slice to the requested count
    const queue = shuffled.slice(0, selectedCount);
    setSessionQueue(queue);
    
    // Setup first question
    setupQuestion(queue[0]);
    
    // Switch state
    setPracticeState('PRACTICING');
  };

  const setupQuestion = (q) => {
    if (!q) return;
    
    let options = [];
    if (q.answer_type === 'TRUE_FALSE') {
      options = ['True', 'False']; 
    } else if (q.answer_type === 'MULTIPLE_CHOICE' || q.answer_type === 'CHECKBOX') {
      options = [...(q.correct_answers || []), ...(q.incorrect_options || [])];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
    }

    setShowAnswer(false);
    setSelectedAnswers([]);
    setCurrentOptions(options);
  };

  const handleOptionClick = (opt) => {
    if (showAnswer) return;
    const currentQuestion = sessionQueue[currentQueueIndex];
    const type = currentQuestion?.answer_type;
    if (type === 'CHECKBOX') {
      setSelectedAnswers(prev => 
        prev.includes(opt) ? prev.filter(a => a !== opt) : [...prev, opt]
      );
    } else {
      setSelectedAnswers([opt]);
    }
  };

  const handleSubmitAnswer = async () => {
    setShowAnswer(true);

    const question = sessionQueue[currentQueueIndex];
    let score = 0;
    const correctAnswers = question.correct_answers || [];
    
    if (question.answer_type === 'MULTIPLE_CHOICE' || question.answer_type === 'TRUE_FALSE') {
      const isCorrect = selectedAnswers.length === 1 && correctAnswers.includes(selectedAnswers[0]);
      score = isCorrect ? 1 : 0;
    } else if (question.answer_type === 'CHECKBOX') {
      let correctCount = 0;
      let wrongCount = 0;
      selectedAnswers.forEach(ans => {
        if (correctAnswers.includes(ans)) correctCount++;
        else wrongCount++;
      });
      let rawScore = (correctCount - wrongCount) / Math.max(1, correctAnswers.length);
      score = Math.max(0, Math.min(1, rawScore));
    } else if (question.answer_type === 'OPEN_ENDED') {
      const userText = (selectedAnswers[0] || '').trim().toLowerCase();
      const match = correctAnswers.some(ans => ans.trim().toLowerCase() === userText);
      score = match ? 1 : 0;
    }

    setSessionScore(prev => prev + score);

    if (savePracticeActivity) {
      await savePracticeActivity({
        sessionId: sessionId,
        questionId: question.id,
        correctAnswer: JSON.stringify(correctAnswers),
        myAnswer: JSON.stringify(selectedAnswers),
        correctnessScore: score
      });
    }
  };

  const handleNext = () => {
    const nextIndex = currentQueueIndex + 1;
    if (nextIndex >= sessionQueue.length) {
      setPracticeState('SUMMARY');
    } else {
      setCurrentQueueIndex(nextIndex);
      setupQuestion(sessionQueue[nextIndex]);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <LoadingSpinner size="lg" text="Loading your library..." />
        </main>
      </>
    );
  }

  if (allQuestions.length === 0) {
    return (
      <>
        <Navbar />
        <main className="page">
          <div className="container" style={{ maxWidth: '600px', marginTop: 'var(--space-10)' }}>
            <EmptyState
              icon={Dices}
              title="No questions yet"
              description="You need to generate or add some questions before you can practice."
              action={
                <Link to="/generate" className="btn btn-primary">
                  Generate Questions
                </Link>
              }
            />
          </div>
        </main>
      </>
    );
  }

  // -------------------------------------------------------------
  // RENDER: SETUP STATE
  // -------------------------------------------------------------
  if (practiceState === 'SETUP') {
    const maxAllowed = Math.min(30, filteredQuestions.length);

    return (
      <>
        <Navbar />
        <main className="page">
          <div className="container" style={{ maxWidth: '600px', marginTop: 'var(--space-10)' }}>
            <div className="card animate-in" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={32} />
                </div>
              </div>
              <h2 style={{ marginBottom: 'var(--space-2)' }}>Configure Practice Session</h2>
              <p style={{ color: 'var(--neutral-600)', marginBottom: 'var(--space-8)' }}>
                Filter by categories and tags to build your practice queue.
              </p>
              
              <div style={{ marginBottom: 'var(--space-6)', textAlign: 'left' }}>
                <label style={{ fontWeight: 'var(--weight-medium)', color: 'var(--neutral-700)', display: 'block', marginBottom: 'var(--space-3)' }}>Categories</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {categories.map(cat => (
                    <div 
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className="badge"
                      style={{ 
                        cursor: 'pointer', 
                        padding: 'var(--space-2) var(--space-3)',
                        border: selectedCategories.includes(cat.id) ? 'none' : '1px solid var(--neutral-300)', 
                        background: selectedCategories.includes(cat.id) ? 'var(--primary-500)' : 'var(--neutral-100)', 
                        color: selectedCategories.includes(cat.id) ? 'white' : 'var(--neutral-700)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      📁 {cat.name}
                    </div>
                  ))}
                  {categories.length === 0 && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>No categories found.</span>}
                </div>
              </div>

              <div style={{ marginBottom: 'var(--space-8)', textAlign: 'left' }}>
                <label style={{ fontWeight: 'var(--weight-medium)', color: 'var(--neutral-700)', display: 'block', marginBottom: 'var(--space-3)' }}>Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {tags.map(tag => (
                    <div 
                      key={tag.id}
                      onClick={() => toggleTag(tag.name)}
                      className="badge"
                      style={{ 
                        cursor: 'pointer', 
                        padding: 'var(--space-2) var(--space-3)',
                        border: selectedTags.includes(tag.name) ? 'none' : '1px solid var(--neutral-300)', 
                        background: selectedTags.includes(tag.name) ? 'var(--primary-500)' : 'var(--neutral-100)', 
                        color: selectedTags.includes(tag.name) ? 'white' : 'var(--neutral-700)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      # {tag.name}
                    </div>
                  ))}
                  {tags.length === 0 && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>No tags found.</span>}
                </div>
              </div>

              <div style={{ textAlign: 'left', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <label style={{ fontWeight: 'var(--weight-medium)', color: 'var(--neutral-700)' }}>Number of Questions (Max 30)</label>
                  <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--primary-600)' }}>{selectedCount}</span>
                </div>
                <input 
                  type="range" 
                  min={maxAllowed > 0 ? 1 : 0} 
                  max={maxAllowed} 
                  value={selectedCount} 
                  onChange={(e) => setSelectedCount(parseInt(e.target.value))}
                  disabled={maxAllowed === 0}
                  style={{ width: '100%', cursor: maxAllowed > 0 ? 'pointer' : 'not-allowed' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-1)' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>{maxAllowed > 0 ? 1 : 0}</span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>Total Pool: {filteredQuestions.length}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-6)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--neutral-600)' }}>
                  <input 
                    type="checkbox" 
                    checked={setAsDefault} 
                    onChange={(e) => setSetAsDefault(e.target.checked)} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  Set this as default?
                </label>
              </div>

              <button 
                className="btn btn-primary btn-lg" 
                style={{ width: '100%' }}
                onClick={startPractice}
                disabled={filteredQuestions.length === 0}
              >
                {filteredQuestions.length === 0 ? 'No Questions Match Filters' : `Start Practice (${selectedCount} Qs)`} <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  // -------------------------------------------------------------
  // RENDER: SUMMARY STATE
  // -------------------------------------------------------------
  if (practiceState === 'SUMMARY') {
    const totalPossible = sessionQueue.length;
    const formattedScore = Number.isInteger(sessionScore) ? sessionScore : sessionScore.toFixed(1);
    const scorePercentage = (sessionScore / totalPossible) * 100;

    let message = "Good effort!";
    if (scorePercentage >= 90) message = "Outstanding!";
    else if (scorePercentage >= 70) message = "Great job!";
    
    return (
      <>
        <Navbar />
        <main className="page">
          <div className="container" style={{ maxWidth: '600px', marginTop: 'var(--space-10)' }}>
            <div className="card animate-in" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-6)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--warning-100)', color: 'var(--warning-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={40} />
                </div>
              </div>
              <h2 style={{ marginBottom: 'var(--space-2)' }}>Session Complete</h2>
              <p style={{ color: 'var(--neutral-600)', marginBottom: 'var(--space-8)' }}>{message}</p>
              
              <div style={{ background: 'var(--neutral-50)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-8)' }}>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 'var(--space-2)' }}>Your Score</div>
                <div style={{ fontSize: '48px', fontWeight: '900', color: 'var(--neutral-800)', lineHeight: '1' }}>
                  {formattedScore} <span style={{ fontSize: '24px', color: 'var(--neutral-400)', fontWeight: '500' }}>/ {totalPossible}</span>
                </div>
                <div style={{ marginTop: 'var(--space-4)', width: '100%', height: '8px', background: 'var(--neutral-200)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${scorePercentage}%`, background: 'var(--primary-500)', transition: 'width 1s ease-out' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                <button 
                  className="btn btn-secondary btn-lg" 
                  style={{ flex: 1 }}
                  onClick={() => navigate('/')}
                >
                  Dashboard
                </button>
                <button 
                  className="btn btn-primary btn-lg" 
                  style={{ flex: 1 }}
                  onClick={() => setPracticeState('SETUP')}
                >
                  <RotateCcw size={18} /> Practice Again
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // -------------------------------------------------------------
  // RENDER: PRACTICING STATE
  // -------------------------------------------------------------
  const currentQuestion = sessionQueue[currentQueueIndex];
  const progressPct = ((currentQueueIndex) / sessionQueue.length) * 100;

  const renderOptions = () => {
    if (!currentQuestion) return null;
    
    if (currentQuestion.answer_type === 'MULTIPLE_CHOICE' || currentQuestion.answer_type === 'CHECKBOX' || currentQuestion.answer_type === 'TRUE_FALSE') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          {currentOptions.map((opt, i) => {
            const isCorrect = currentQuestion.correct_answers.includes(opt);
            const isSelected = selectedAnswers.includes(opt);
            
            let bgClass = 'var(--neutral-50)';
            let borderClass = 'var(--border-light)';
            let textColor = 'var(--neutral-800)';
            
            if (showAnswer) {
              if (isCorrect) {
                bgClass = 'var(--success-50)';
                borderClass = 'var(--success-500)';
                textColor = 'var(--success-700)';
              } else if (isSelected) {
                bgClass = 'var(--danger-50)';
                borderClass = 'var(--danger-500)';
                textColor = 'var(--danger-700)';
              } else {
                bgClass = 'var(--neutral-100)';
                textColor = 'var(--neutral-500)';
              }
            } else if (isSelected) {
              bgClass = 'var(--primary-50)';
              borderClass = 'var(--primary-500)';
              textColor = 'var(--primary-700)';
            }
            
            return (
              <div 
                key={i}
                onClick={() => handleOptionClick(opt)}
                style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: bgClass,
                  border: `2px solid ${borderClass}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  transition: 'all 0.2s ease',
                  cursor: showAnswer ? 'default' : 'pointer',
                  opacity: showAnswer && !isCorrect && !isSelected ? 0.6 : 1
                }}
              >
                <div style={{ 
                  width: '28px', height: '28px', borderRadius: '50%', 
                  background: showAnswer ? (isCorrect ? 'var(--success-500)' : isSelected ? 'var(--danger-500)' : 'white') : (isSelected ? 'var(--primary-500)' : 'white'), 
                  border: showAnswer ? 'none' : (isSelected ? 'none' : '1px solid var(--neutral-300)'),
                  color: showAnswer ? (isCorrect || isSelected ? 'white' : 'var(--neutral-600)') : (isSelected ? 'white' : 'var(--neutral-600)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 'bold'
                }}>
                  {String.fromCharCode(65 + i)}
                </div>
                <span style={{ fontSize: 'var(--text-md)', flex: 1, color: textColor, fontWeight: isSelected ? '500' : 'normal' }}>{opt}</span>
                {showAnswer && isCorrect && <CheckCircle size={20} color="var(--success-500)" />}
                {showAnswer && isSelected && !isCorrect && <span style={{ color: 'var(--danger-500)', fontWeight: 'bold', fontSize: '18px' }}>✕</span>}
              </div>
            );
          })}
        </div>
      );
    }
    
    if (currentQuestion.answer_type === 'OPEN_ENDED') {
      return (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <textarea 
            placeholder="Type your answer here..."
            value={selectedAnswers[0] || ''}
            onChange={(e) => {
              if (!showAnswer) setSelectedAnswers([e.target.value]);
            }}
            disabled={showAnswer}
            style={{ 
              width: '100%', 
              minHeight: '100px', 
              padding: 'var(--space-3)', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border-light)',
              background: showAnswer ? 'var(--neutral-100)' : 'white',
              fontSize: 'var(--text-md)',
              resize: 'vertical'
            }}
          />
        </div>
      );
    }
    
    return null;
  };

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="container" style={{ maxWidth: '700px' }}>
          
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--neutral-700)' }}>
                Question {currentQueueIndex + 1} of {sessionQueue.length}
              </span>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={() => setPracticeState('SETUP')}
                style={{ color: 'var(--danger-500)' }}
              >
                End Session
              </button>
            </div>
            <div style={{ height: '6px', background: 'var(--neutral-200)', borderRadius: '3px', overflow: 'hidden' }}>
              <div 
                style={{ height: '100%', width: `${progressPct}%`, background: 'var(--primary-500)', transition: 'width 0.3s ease' }}
              />
            </div>
          </div>
          
          <div className="card animate-in" style={{ padding: 'var(--space-8)', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span className="badge badge-primary" style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--text-sm)' }}>
                  {currentQuestion?.answer_type?.replace('_', ' ')}
                </span>
                
                {currentQuestion?.category_name && currentQuestion?.category_id && (
                  <Link to={`/categories/${currentQuestion.category_id}`} style={{ textDecoration: 'none' }}>
                    <span className="badge badge-interactive" style={{ background: 'var(--neutral-100)', color: 'var(--neutral-700)', border: '1px solid var(--neutral-200)', cursor: 'pointer' }}>
                      📁 {currentQuestion.category_name}
                    </span>
                  </Link>
                )}
                {currentQuestion?.tags?.map((tag, idx) => (
                  <Link to="/tags" key={idx} style={{ textDecoration: 'none' }}>
                    <span className="badge badge-interactive" style={{ background: 'var(--neutral-100)', color: 'var(--neutral-600)', border: '1px solid var(--neutral-200)', cursor: 'pointer' }}>
                      # {tag}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            
            <h3 style={{ fontSize: 'var(--text-xl)', lineHeight: '1.6', marginBottom: 'var(--space-6)', color: 'var(--neutral-900)' }}>
              {currentQuestion?.question_text}
            </h3>
            
            {renderOptions()}
            
            {showAnswer && currentQuestion?.answer_type === 'OPEN_ENDED' && (
              <div className="animate-in fade-in" style={{ 
                marginTop: 'var(--space-6)', 
                padding: 'var(--space-5)', 
                background: 'var(--success-50)', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--success-200)'
              }}>
                <h4 style={{ color: 'var(--success-700)', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Correct Answer
                </h4>
                <p style={{ fontSize: 'var(--text-md)', color: 'var(--neutral-800)', fontWeight: 'var(--weight-medium)' }}>
                  {(currentQuestion?.correct_answers || []).join(', ')}
                </p>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
              {!showAnswer ? (
                <button 
                  className="btn btn-primary btn-lg" 
                  style={{ width: '100%', maxWidth: '300px' }}
                  onClick={handleSubmitAnswer} 
                  disabled={selectedAnswers.length === 0 && currentQuestion?.answer_type !== 'OPEN_ENDED'}
                  id="btn-show-answer"
                >
                  <Eye size={18} /> Submit Answer
                </button>
              ) : (
                <button 
                  className="btn btn-primary btn-lg" 
                  style={{ width: '100%', maxWidth: '300px' }}
                  onClick={handleNext} 
                  id="btn-next-question"
                >
                  {currentQueueIndex >= sessionQueue.length - 1 ? (
                    <>Finish Session <ArrowRight size={18} /></>
                  ) : (
                    <>Next Question <ArrowRight size={18} /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
