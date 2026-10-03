import styles from './Chip.module.css';

// `colour` is a category colour key (saffron, sand, …); leave it out for a plain chip.
export function Chip({ children, colour }) {
  return (
    <span className={styles.chip}>
      {colour && <span className={`${styles.dot} ${styles[colour]}`} />}
      {children}
    </span>
  );
}
