import { useId } from 'react';
import styles from './Choices.module.css';

// Pick one of a few options, shown as buttons. Real radio inputs underneath,
// so keyboards and screen readers work as usual. `options` is a list of
// [value, label]. `ref` reaches the first option, so a form can move focus
// here when nothing has been picked. `wide` puts one option per line, for
// long labels.
export function Choices({ legend, options, value, onChange, error, ref, wide = false }) {
  const name = useId();
  const errorId = useId();
  return (
    <fieldset className={styles.choices} aria-describedby={error ? errorId : undefined}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={wide ? styles.oneColumn : styles.twoColumns}>
        {options.map(([optionValue, label], index) => (
          <label key={optionValue} className={styles.option}>
            <input
              ref={index === 0 ? ref : undefined}
              type="radio"
              name={name}
              className={styles.radio}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
            />
            {label}
          </label>
        ))}
      </div>
      {error && <span id={errorId} className={styles.error}>{error}</span>}
    </fieldset>
  );
}
