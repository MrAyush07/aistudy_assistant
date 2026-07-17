import { useState, useEffect, useCallback } from 'react';

export default function FlashcardMode({ flashcards }) {
  const [deck, setDeck]               = useState([]);
  const [fullDeck, setFullDeck]       = useState([]);
  const [cardIndex, setCardIndex]     = useState(0);
  const [flipped, setFlipped]         = useState(false);
  const [hardCards, setHardCards]     = useState([]);
  const [deckComplete, setDeckComplete] = useState(false);

  useEffect(() => {
    setDeck(flashcards);
    setFullDeck(flashcards);
    setCardIndex(0); setFlipped(false);
    setHardCards([]); setDeckComplete(false);
  }, []); // eslint-disable-line

  const currentCard = deck[cardIndex];
  const isFirst = cardIndex === 0;
  const isLast  = cardIndex === deck.length - 1;
  const alreadyHard = hardCards.some(c => c.front === currentCard?.front && c.back === currentCard?.back);
  const progress = deck.length ? ((cardIndex + 1) / deck.length) * 100 : 0;

  const handleFlip  = useCallback(() => setFlipped(f => !f), []);
  const handlePrev  = useCallback(() => { if (!isFirst) { setCardIndex(i => i - 1); setFlipped(false); } }, [isFirst]);
  const handleNext  = useCallback(() => {
    if (isLast) { setDeckComplete(true); return; }
    setCardIndex(i => i + 1); setFlipped(false);
  }, [isLast]);
  const handleMarkHard = () => { if (!alreadyHard) setHardCards(p => [...p, currentCard]); };
  const handleRetestHard = () => { setDeck(hardCards); setCardIndex(0); setFlipped(false); setHardCards([]); setDeckComplete(false); };

  // Keyboard navigation
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft')  handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); handleFlip(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleFlip, handlePrev, handleNext]);

  if (!deck.length) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No flashcards available.</p>;

  if (deckComplete) {
    return (
      <div style={s.container} className="fade-in">
        <div style={s.completeCard} role="status">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }} aria-hidden="true">🎉</div>
          <h2 style={s.completeTitle}>Deck complete!</h2>
          <p style={s.completeSub}>You reviewed all {fullDeck.length} cards.</p>
          {hardCards.length > 0 ? (
            <button style={s.primaryBtn} onClick={handleRetestHard}>
              🔁 Re-test Hard Cards ({hardCards.length})
            </button>
          ) : (
            <p style={{ color: 'var(--success)', fontWeight: 600 }}>✓ No hard cards — great job!</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      {/* Header row */}
      <div style={s.headerRow}>
        <span style={s.counter} aria-label={`Card ${cardIndex + 1} of ${deck.length}`}>
          {cardIndex + 1} <span style={{ color: 'var(--text-subtle)' }}>/ {deck.length}</span>
        </span>
        {hardCards.length > 0 && (
          <span style={s.hardBadge} aria-label={`${hardCards.length} cards marked hard`}>
            ⭐ {hardCards.length} hard
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="progress-bar-track" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* 3D flip card */}
      <div style={s.scene} onClick={handleFlip} role="button" tabIndex={0}
        aria-label={flipped ? `Card back: ${currentCard.back}` : `Card front: ${currentCard.front}. Press to flip.`}
        onKeyDown={e => e.key === 'Enter' && handleFlip()}
      >
        <div style={{ ...s.cardInner, transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
          {/* Front */}
          <div style={{ ...s.cardFace, ...s.cardFront }}>
            <span style={s.faceLabel}>Front</span>
            <p style={s.cardText}>{currentCard.front}</p>
            <span style={s.flipHint}>tap or press Space to flip →</span>
          </div>
          {/* Back */}
          <div style={{ ...s.cardFace, ...s.cardBack }}>
            <span style={{ ...s.faceLabel, color: 'rgba(255,255,255,0.7)' }}>Back</span>
            <p style={{ ...s.cardText, color: '#fff' }}>{currentCard.back}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={s.navRow}>
        <button style={{ ...s.navBtn, opacity: isFirst ? 0.4 : 1, cursor: isFirst ? 'not-allowed' : 'pointer' }}
          onClick={handlePrev} disabled={isFirst} aria-label="Previous card">
          ← Prev
        </button>
        <button style={{ ...s.hardBtn, ...(alreadyHard ? s.hardBtnDone : {}) }}
          onClick={handleMarkHard} disabled={alreadyHard}
          aria-label={alreadyHard ? 'Already marked hard' : 'Mark as hard'}>
          {alreadyHard ? '⭐ Marked Hard' : '☆ Mark Hard'}
        </button>
        <button style={s.navBtn} onClick={handleNext} aria-label={isLast ? 'Finish deck' : 'Next card'}>
          {isLast ? 'Finish' : 'Next →'}
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="kbd-hint" aria-hidden="true">
        <span><span className="kbd">←</span><span className="kbd">→</span> navigate</span>
        <span><span className="kbd">Space</span> flip</span>
      </div>
    </div>
  );
}

const s = {
  container: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '1rem', padding: '0.5rem 0', width: '100%', maxWidth: 620, margin: '0 auto',
  },
  headerRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%',
  },
  counter: { fontSize: '1rem', fontWeight: 700, color: 'var(--text)' },
  hardBadge: {
    fontSize: '0.78rem', fontWeight: 600,
    background: 'var(--warning-bg)', color: 'var(--warning)',
    border: '1px solid var(--warning-border)', borderRadius: '99px', padding: '2px 10px',
  },
  scene: {
    width: '100%', height: 240,
    perspective: 1000,
    cursor: 'pointer',
    outline: 'none',
  },
  cardInner: {
    position: 'relative', width: '100%', height: '100%',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  cardFace: {
    position: 'absolute', inset: 0,
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
    borderRadius: 'var(--radius-xl)',
    padding: '2rem',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    boxShadow: 'var(--shadow-md)',
    gap: '0.75rem',
  },
  cardFront: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
  },
  cardBack: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    transform: 'rotateY(180deg)',
  },
  faceLabel: {
    fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--text-subtle)', alignSelf: 'flex-start',
  },
  cardText: {
    fontSize: '1.15rem', lineHeight: 1.6, margin: 0,
    textAlign: 'center', color: 'var(--text)', fontWeight: 500,
  },
  flipHint: {
    fontSize: '0.75rem', color: 'var(--text-subtle)',
    alignSelf: 'flex-end', marginTop: 'auto',
  },
  navRow: {
    display: 'flex', gap: '0.6rem', width: '100%', justifyContent: 'space-between',
  },
  navBtn: {
    flex: 1, minHeight: 44, minWidth: 44,
    padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 600,
    background: 'var(--bg-card)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
    transition: 'background var(--transition), border-color var(--transition)',
  },
  hardBtn: {
    minHeight: 44, minWidth: 44, padding: '0.5rem 0.9rem',
    fontSize: '0.85rem', fontWeight: 600,
    background: 'var(--warning-bg)', color: 'var(--warning)',
    border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
    transition: 'background var(--transition)',
    whiteSpace: 'nowrap',
  },
  hardBtnDone: {
    background: 'var(--warning-bg)', color: 'var(--warning)', opacity: 0.7, cursor: 'default',
  },
  primaryBtn: {
    minHeight: 46, padding: '0.6rem 1.5rem',
    fontSize: '0.95rem', fontWeight: 700,
    background: 'var(--primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
  },
  completeCard: {
    width: '100%', padding: '2.5rem 2rem',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)',
    textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
  },
  completeTitle: { margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' },
  completeSub: { margin: 0, color: 'var(--text-muted)' },
};
