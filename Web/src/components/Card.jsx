import styles from './Card.module.css';

export function Card({ children }) {
  return <section className={styles.card}>{children}</section>;
}
