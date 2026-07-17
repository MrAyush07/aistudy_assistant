import styles from './InputPanel.module.css';

/**
 * @param {string}   props.value
 * @param {Function} props.onChange
 * @param {Function} props.onSubmit
 * @param {boolean}  props.isLoading
 */
export default function InputPanel({ value, onChange, onSubmit, isLoading }) {
  const isSubmitDisabled = isLoading || value.trim() === '';
  const nearLimit = value.length > 18000;

  return (
    <div className={styles.container}>
      <label htmlFor="study-input" className={styles.label}>
        Your Notes or Topic
      </label>
      <textarea
        id="study-input"
        className={styles.textarea}
        value={value}
        onChange={onChange}
        disabled={isLoading}
        maxLength={20000}
        placeholder="Paste your notes, a chapter summary, or just a topic like &quot;Photosynthesis&quot; or &quot;World War II causes&quot;…"
        aria-label="Study input text"
        aria-disabled={isLoading}
      />
      <div className={styles.meta}>
        <span
          className={`${styles.charCount}${nearLimit ? ' ' + styles.nearLimit : ''}`}
          aria-live="polite"
        >
          {value.length.toLocaleString()} / 20,000
        </span>
      </div>
      <button
        type="button"
        className={styles.submitButton}
        onClick={onSubmit}
        disabled={isSubmitDisabled}
        aria-disabled={isSubmitDisabled}
        aria-busy={isLoading}
      >
        {isLoading && <span className={styles.spinner} aria-hidden="true" />}
        {isLoading ? 'Generating…' : '✦ Generate Study Materials'}
      </button>
    </div>
  );
}
