import { useId } from 'react';
import styles from './Field.module.css';

// A labelled input. `prefix` sits inside the box before the text (e.g. "₹").
// `ref` reaches the input, so a form can move focus to a field with a problem.
export function Field({ label, hint, error, prefix, ref, ...inputProps }) {
  const errorId = useId();
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.box}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input
          ref={ref}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
      </span>
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span id={errorId} className={styles.error}>{error}</span>}
    </label>
  );
}
