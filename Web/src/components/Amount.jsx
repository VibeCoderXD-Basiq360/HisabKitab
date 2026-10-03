import { formatRupees } from '../money.js';
import styles from './Amount.module.css';

// The number only. Whoever shows it pairs it with a word ("owes you",
// "outstanding") — direction is never shown by colour alone.
export function Amount({ value, large = false }) {
  return <span className={large ? `${styles.amount} ${styles.large}` : styles.amount}>{formatRupees(value)}</span>;
}
