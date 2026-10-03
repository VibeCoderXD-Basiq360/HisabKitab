import styles from './Button.module.css';

// `quiet` is for the secondary action next to a lime one. `wide` fills the row.
export function Button({ children, quiet = false, wide = false, type = 'button', ...buttonProps }) {
  const classes = [styles.button, quiet ? styles.quiet : styles.primary, wide && styles.wide];
  return (
    <button type={type} className={classes.filter(Boolean).join(' ')} {...buttonProps}>
      {children}
    </button>
  );
}
