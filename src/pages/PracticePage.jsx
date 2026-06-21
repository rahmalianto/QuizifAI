import { useState, useEffect } from 'react';
import { useQuestions } from '../hooks/useQuestions';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Dices, ArrowRight, CheckCircle, Eye } from 'lucide-react';

export default function PracticePage() {
  const { fetchAllQuestions, savePracticeActivity } = useQuestions();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const data = await fetchAllQuestions();
        setQuestions(data);
        if (data.length > 0) {
          pickRandomQuestion(data);
        }
      } catch (err) {
        console.error('Failed to load questions', err);
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [fetchAllQuestions]);

  const pickRandomQuestion = (pool) => {
    if (!pool || pool.length === 0) return;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const q = pool[randomIndex];
    
    // Determine options and shuffle them if needed
    let options = [];
    if (q.answer_type === 'TRUE_FALSE') {
      options = ['True', 'False']; // Keep True/False in standard order
    } else if (q.answer_type === 'MULTIPLE_CHOICE' || q.answer_type === 'CHECKBOX') {
      options = [...(q.correct_answers || []), ...(q.incorrect_options || [])];
      // Fisher-Yates shuffle
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
    }

    setCurrentIndex(randomIndex);
    setShowAnswer(false);
    setSelectedAnswers([]);
    setCurrentOptions(options);
  };

  const handleOptionClick = (opt) => {
    if (showAnswer) return;
    const type = questions[currentIndex]?.answer_type;
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

    const question = questions[currentIndex];
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
    pickRandomQuestion(questions);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <LoadingSpinner size="lg" text="Loading your questions..." />
        </main>
      </>
    );
  }

  if (questions.length === 0) {
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
                <a href="/generate" className="btn btn-primary">
                  Generate Questions
                </a>
              }
            />
          </div>
        </main>
      </>
    );
  }

  const currentQuestion = questions[currentIndex];

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
          <div className="page-header" style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
            <h1 id="practice-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
              <Dices size={28} className="text-primary-500" />
              Practice Mode
            </h1>
            <p>Testing your knowledge with random questions from your library.</p>
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
                  <ArrowRight size={18} /> Next Random Question
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
