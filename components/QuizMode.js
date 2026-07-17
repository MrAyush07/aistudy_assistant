import { useState, useEffect, useCallback } from 'react';

export default function QuizMode({ questions: initialQuestions }) {
  const [questions, setQuestions]         = useState([]);
  const [fullQuestions, setFullQuestions] = useState([]);
  const [qIndex, setQIndex]               = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [wrongAnswers, setWrongAnswers]   = useState([]);
  const [quizComplete, setQuizComplete]   = useState(false);
  const [score, setScore]                 = useState(0);

  useEffect(() => {
    setQuestions(initialQuestions); setFullQuestions(initialQuestions);
    setQIndex(0); setSelectedIndex(null);
    setWrongAnswers([]); setQuizComplete(false); setScore(0);
  }, []); // eslint-disable-line

  const currentQuestion = questions[qIndex];
  const total = questions.length;
  const progress = total ? ((qIndex + (selectedIndex !== null ? 1 : 0)) / total) * 100 : 0;

  const handleSelect = useCallback((idx) => {
    if (selectedIndex !== null || !currentQuestion) return;
    setSelectedIndex(idx);
    if (idx === currentQuestion.correctIndex) setScore(s => s + 1);
    else setWrongAnswers(w => [...w, currentQuestion]);
  }, [selectedIndex, currentQuestion]);

  const handleNext = useCallback(() => {
    if (selectedIndex === null) return;
    if (qIndex < total - 1) { setQIndex(i => i + 1); setSelectedIndex(null); }
    else setQuizComplete(true);
  }, [selectedIndex, qIndex, total]);

  const handleRetest = () => {
    setQuestions(wrongAnswers); setQIndex(0); setSelectedIndex(null);
    setWrongAnswers([]); setQuizComplete(false); setScore(0);
  };

  // Keyboard: 1-4 to answer, Enter/Space to advance
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 4) handleSelect(num - 1);
      if ((e.key === 'Enter' || e.key === ' ') && selectedIndex !== null) { e.preventDefault(); handleNext(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleSelect, handleNext, selectedIndex]);

  if (questions.length === 0) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No questions available.</p>;

  const pct = total ? Math.round((score / total) * 100) : 0;

  if (quizComplete) {
    return (
      <div style={s.container} className="fade-in">
        <div style={s.scoreCard} role="status">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }} aria-hidden="true">
            {pct === 100 ? '🏆' : pct >= 70 ? '🎉' : '📖'}
          </div>
          <h2 style={s.scoreTitle}>Quiz Complete</h2>
          <div style={s.scorePct} aria-label={`${score} out of ${total} correct, ${pct}%`}>
            {score}<span style={{ fontSize: '1.25rem', opacity: 0.6 }}>/{total}</span>
          </div>
          <div style={s.scoreBar}>
            <div style={{ ...s.scoreBarFill, width: `${pct}%`, background: pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)' }} />
          </div>
          <p style={s.scoreLabel}>{pct}% correct</p>

          {wrongAnswers.length > 0 ? (
            <>
              <div style={s.reviewList} aria-label="Incorrect answers to review">
                <p style={s.reviewHeading}>Review these answers:</p>
                {wrongAnswers.map((wq, i) => (
                  <div key={i} style={s.reviewItem}>
                    <p style={s.reviewQ}>{wq.question}</p>
                    <p style={s.reviewA}>✓ {wq.options[wq.correctIndex]}</p>
                  </div>
                ))}
              </div>
              <button style={s.primaryBtn} onClick={handleRetest}>
                🔁 Re-test Wrong Answers ({wrongAnswers.length})
              </button>
            </>
          ) : (
            <p style={{ color: 'var(--success)', fontWeight: 700, fontSize: '1rem' }}>Perfect score — excellent work! 🌟</p>
          )}
        </div>
      </div>
    );
  }

  function getOptionStyle(idx) {
    const base = s.optionBtn;
    if (selectedIndex === null) return base;
    if (idx === currentQuestion.correctIndex) return { ...base, ...s.optCorrect };
    if (idx === selectedIndex) return { ...base, ...s.optWrong };
    return { ...base, ...s.optDim };
  }

  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.headerRow}>
        <span style={s.qCounter}>{qIndex + 1} <span style={{ color: 'var(--text-subtle)' }}>/ {total}</span></span>
        <span style={s.scorePill}>Score: {score}/{qIndex}</span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar-track" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Question card */}
      <div style={s.questionCard}>
        <p style={s.questionText}>{currentQuestion.question}</p>
      </div>

      {/* Options */}
      <ul style={s.optionList} role="list">
        {currentQuestion.options.map((opt, idx) => (
          <li key={idx}>
            <button
              style={getOptionStyle(idx)}
              type="button"
              onClick={() => handleSelect(idx)}
              disabled={selectedIndex !== null}
              aria-pressed={selectedIndex === idx}
              aria-label={`Option ${idx + 1}: ${opt}`}
            >
              <span style={s.optLetter}>{String.fromCharCode(65 + idx)}</span>
              <span style={s.optText}>{opt}</span>
              {selectedIndex !== null && idx === currentQuestion.correctIndex && <span style={s.optIcon} aria-hidden="true">✓</span>}
              {selectedIndex === idx && idx !== currentQuestion.correctIndex && <span style={s.optIcon} aria-hidden="true">✗</span>}
            </button>
          </li>
        ))}
      </ul>

      {/* Feedback + next */}
      {selectedIndex !== null && (
        <div style={s.feedbackRow} className="fade-in">
          <p style={{ ...s.feedbackText, color: selectedIndex === currentQuestion.correctIndex ? 'var(--success)' : 'var(--error)' }}>
            {selectedIndex === currentQuestion.correctIndex ? '✓ Correct!' : `✗ Incorrect — correct answer: "${currentQuestion.options[currentQuestion.correctIndex]}"`}
          </p>
          <button style={s.nextBtn} onClick={handleNext} aria-label={qIndex < total - 1 ? 'Next question' : 'Finish quiz'}>
            {qIndex < total - 1 ? 'Next →' : 'Finish Quiz'}
          </button>
        </div>
      )}

      {/* Keyboard hints */}
      <div className="kbd-hint" aria-hidden="true">
        <span><span className="kbd">1</span>–<span className="kbd">4</span> answer</span>
        <span><span className="kbd">Enter</span> next</span>
      </div>
    </div>
  );
}

const s = {
  container: {
    display: 'flex', flexDirection: 'column',
    gap: '1rem', width: '100%', maxWidth: 620, margin: '0 auto',
  },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  qCounter: { fontSize: '1rem', fontWeight: 700, color: 'var(--text)' },
  scorePill: {
    fontSize: '0.8rem', fontWeight: 600, padding: '3px 10px',
    background: 'var(--primary-subtle)', color: 'var(--primary)',
    border: '1px solid rgba(99,102,241,0.2)', borderRadius: '99px',
  },
  questionCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem',
    boxShadow: 'var(--shadow-card)',
  },
  questionText: {
    margin: 0, fontSize: '1.05rem', fontWeight: 600,
    lineHeight: 1.55, color: 'var(--text)',
  },
  optionList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  optionBtn: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    width: '100%', minHeight: 50, padding: '0.7rem 1rem',
    fontSize: '0.95rem', textAlign: 'left',
    background: 'var(--bg-card)', color: 'var(--text)',
    border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
    cursor: 'pointer', transition: 'background var(--transition), border-color var(--transition)',
    boxSizing: 'border-box',
  },
  optCorrect: { background: 'var(--success-bg)', borderColor: 'var(--success-border)', color: 'var(--success)' },
  optWrong: { background: 'var(--error-bg)', borderColor: 'var(--error-border)', color: 'var(--error)' },
  optDim: { opacity: 0.5 },
  optLetter: {
    flexShrink: 0, width: 28, height: 28,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-elevated)', borderRadius: '50%',
    fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)',
  },
  optText: { flex: 1 },
  optIcon: { flexShrink: 0, fontWeight: 700 },
  feedbackRow: {
    display: 'flex', flexWrap: 'wrap', alignItems: 'center',
    gap: '0.75rem', padding: '0.75rem 0',
  },
  feedbackText: { margin: 0, fontSize: '0.9rem', fontWeight: 600, flex: 1, minWidth: '200px' },
  nextBtn: {
    minHeight: 44, padding: '0.5rem 1.25rem',
    fontSize: '0.95rem', fontWeight: 700,
    background: 'var(--primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(99,102,241,0.3)',
    flexShrink: 0,
  },
  scoreCard: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', padding: '2.5rem 2rem',
    boxShadow: 'var(--shadow-card)', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
    width: '100%',
  },
  scoreTitle: { margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)' },
  scorePct: { fontSize: '3.5rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1 },
  scoreLabel: { margin: 0, color: 'var(--text-muted)', fontWeight: 600 },
  scoreBar: {
    width: '100%', height: 10, background: 'var(--border)', borderRadius: 99, overflow: 'hidden',
  },
  scoreBarFill: { height: '100%', borderRadius: 99, transition: 'width 0.6s ease' },
  reviewList: {
    width: '100%', textAlign: 'left', marginTop: '0.5rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
  },
  reviewHeading: { margin: '0 0 0.25rem', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  reviewItem: {
    padding: '0.75rem', borderRadius: 'var(--radius-md)',
    background: 'var(--error-bg)', border: '1px solid var(--error-border)',
  },
  reviewQ: { margin: '0 0 4px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' },
  reviewA: { margin: 0, color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 },
  primaryBtn: {
    marginTop: '0.5rem', minHeight: 46, padding: '0.6rem 1.5rem',
    fontSize: '0.95rem', fontWeight: 700,
    background: 'var(--primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
  },
};
