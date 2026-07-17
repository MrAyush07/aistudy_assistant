import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import InputPanel from '../components/InputPanel';
import ModeSelector from '../components/ModeSelector';
import FlashcardMode from '../components/FlashcardMode';
import QuizMode from '../components/QuizMode';

export default function Home() {
  const [inputText, setInputText]       = useState('');
  const [studyContent, setStudyContent] = useState(null);
  const [uiState, setUiState]           = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeMode, setActiveMode]     = useState('flashcard');
  const [theme, setTheme]               = useState('light');
  const abortRef                        = useRef(null);

  // Restore theme from localStorage on mount
  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('sa-theme');
    const preferred = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(preferred);
    document.documentElement.setAttribute('data-theme', preferred);
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sa-theme', next);
  }

  async function handleSubmit() {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    setUiState('loading');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Generation failed');
      }
      const data = await res.json();
      setStudyContent(data);
      setUiState('idle');
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') return;
      setErrorMessage(err.message || 'An unknown error occurred');
      setUiState('error');
    }
  }

  const isLoading = uiState === 'loading';

  return (
    <>
      <Head>
        <title>Study Assistant — AI Flashcards & Quizzes</title>
        <meta name="description" content="Paste your notes or a topic and instantly get AI-generated flashcards and quiz questions." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="page-wrapper">
        {/* ── Hero ── */}
        <header className="hero">
          <div className="hero-inner">
            <div className="hero-left">
              <h1 className="hero-title">
                <span aria-hidden="true">🎓</span> Study Assistant
              </h1>
              <p className="hero-subtitle">
                Paste your notes — get flashcards &amp; quiz questions instantly
              </p>
            </div>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        <main className="container">
          {/* ── Input ── */}
          <div className="section-gap">
            <InputPanel
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          </div>

          {/* ── Loading ── */}
          {uiState === 'loading' && (
            <div style={s.loadingBox} role="status" aria-live="polite">
              <div style={s.loadingSpinner} aria-hidden="true" />
              <div>
                <p style={s.loadingTitle}>Generating your study materials…</p>
                <p style={s.loadingSubtitle}>This usually takes 5–10 seconds</p>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {uiState === 'error' && (
            <div style={s.errorBox} role="alert" className="fade-in">
              <span style={s.errorIcon} aria-hidden="true">⚠️</span>
              <div style={s.errorContent}>
                <p style={s.errorTitle}>Something went wrong</p>
                <p style={s.errorMsg}>{errorMessage}</p>
              </div>
              <button style={s.retryBtn} onClick={handleSubmit} type="button">
                Try Again
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {studyContent === null && uiState === 'idle' && (
            <div style={s.emptyBox} className="fade-in">
              <div style={s.emptyIcon} aria-hidden="true">📚</div>
              <h2 style={s.emptyTitle}>Ready to study?</h2>
              <p style={s.emptyBody}>
                Type a topic or paste your notes above, then hit{' '}
                <strong>Generate Study Materials</strong>.
              </p>
              <div style={s.exampleRow}>
                {['Photosynthesis', 'World War II', 'React hooks', 'The French Revolution'].map((ex) => (
                  <button
                    key={ex}
                    style={s.exampleChip}
                    onClick={() => setInputText(ex)}
                    type="button"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Content ── */}
          {studyContent !== null && uiState === 'idle' && (
            <div className="fade-in section-gap">
              <div style={s.statsRow}>
                <span style={s.statBadge}>🃏 {studyContent.flashcards.length} flashcards</span>
                <span style={s.statBadge}>📝 {studyContent.questions.length} questions</span>
              </div>
              <ModeSelector activeMode={activeMode} onChange={setActiveMode} />
              {activeMode === 'flashcard' ? (
                <FlashcardMode key="flashcard" flashcards={studyContent.flashcards} />
              ) : (
                <QuizMode key="quiz" questions={studyContent.questions} />
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

const s = {
  loadingBox: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    marginTop: '1.75rem', padding: '1.25rem 1.5rem',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
  },
  loadingSpinner: {
    width: 32, height: 32, flexShrink: 0,
    border: '3px solid var(--border)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingTitle: { margin: 0, fontWeight: 600, color: 'var(--text)' },
  loadingSubtitle: { margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-subtle)' },

  errorBox: {
    display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
    marginTop: '1.75rem', padding: '1rem 1.25rem',
    background: 'var(--error-bg)', border: '1px solid var(--error-border)',
    borderRadius: 'var(--radius-lg)',
  },
  errorIcon: { fontSize: '1.25rem', lineHeight: 1, marginTop: 2 },
  errorContent: { flex: 1, minWidth: 0 },
  errorTitle: { margin: 0, fontWeight: 700, color: 'var(--error)' },
  errorMsg: { margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--error)', opacity: 0.85 },
  retryBtn: {
    flexShrink: 0, minHeight: 44, minWidth: 44,
    padding: '0.4rem 1rem', fontSize: '0.9rem', fontWeight: 700,
    background: 'var(--error)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
  },

  emptyBox: {
    textAlign: 'center', marginTop: '2.5rem',
    padding: '2.5rem 1.5rem',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)',
  },
  emptyIcon: { fontSize: '3rem', lineHeight: 1, marginBottom: '0.75rem' },
  emptyTitle: { margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)' },
  emptyBody: { margin: '0 auto', maxWidth: 420, color: 'var(--text-muted)', lineHeight: 1.7 },
  exampleRow: {
    display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
    justifyContent: 'center', marginTop: '1.25rem',
  },
  exampleChip: {
    padding: '0.35rem 0.9rem', fontSize: '0.85rem', fontWeight: 500,
    background: 'var(--primary-subtle)', color: 'var(--primary-dark)',
    border: '1px solid rgba(99,102,241,0.2)', borderRadius: '99px',
    cursor: 'pointer', transition: 'background 0.15s',
  },

  statsRow: {
    display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem',
  },
  statBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.3rem 0.8rem', fontSize: '0.82rem', fontWeight: 600,
    background: 'var(--primary-subtle)', color: 'var(--primary-dark)',
    border: '1px solid rgba(99,102,241,0.2)', borderRadius: '99px',
  },
};
