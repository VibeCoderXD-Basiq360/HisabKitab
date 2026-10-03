import styles from './Row.module.css';

// One line of a list: what it is on the left, its value on the right.
export function Row({ title, detail, trailing }) {
  return (
    <div className={styles.row}>
      <div className={styles.text}>
        <span className={styles.title}>{title}</span>
        {detail && <span className={styles.detail}>{detail}</span>}
      </div>
      {trailing && <div className={styles.trailing}>{trailing}</div>}
    </div>
  );
}
