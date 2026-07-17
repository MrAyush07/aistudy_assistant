/**
 * ModeSelector — pill-style tab bar for switching study modes.
 * @param {'flashcard'|'quiz'} props.activeMode
 * @param {Function} props.onChange
 */
export default function ModeSelector({ activeMode, onChange }) {
  return (
    <div style={s.wrap} role="group" aria-label="Study mode">
      <div style={s.track}>
        {/* Active indicator — glides behind buttons */}
        <div
          style={{
            ...s.indicator,
            transform: activeMode === 'quiz' ? 'translateX(100%)' : 'translateX(0)',
          }}
          aria-hidden="true"
        />
        <button
          style={s.btn}
          aria-pressed={activeMode === 'flashcard'}
          onClick={() => onChange('flashcard')}
        >
          <span aria-hidden="true">🃏</span>
          <span>Flashcards</span>
        </button>
        <button
          style={s.btn}
          aria-pressed={activeMode === 'quiz'}
          onClick={() => onChange('quiz')}
        >
          <span aria-hidden="true">📝</span>
          <span>Quiz</span>
        </button>
      </div>
    </div>
  );
}

const s = {
  wrap: {
    marginBottom: '1.5rem',
  },
  track: {
    display: 'inline-flex',
    position: 'relative',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '99px',
    padding: '3px',
    gap: 0,
  },
  indicator: {
    position: 'absolute',
    top: '3px',
    left: '3px',
    width: 'calc(50% - 3px)',
    height: 'calc(100% - 6px)',
    background: 'var(--primary)',
    borderRadius: '99px',
    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
    pointerEvents: 'none',
  },
  btn: {
    position: 'relative',
    zIndex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    minHeight: '44px',
    minWidth: '120px',
    padding: '0.4rem 1.25rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: '99px',
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'color 0.2s ease',
    outline: 'none',
  },
};
