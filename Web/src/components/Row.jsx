import { Link } from 'react-router';
import styles from './Row.module.css';

// One line of a list: what it is on the left, its value on the right.
// With `to`, the whole row is a link.
export function Row({ title, detail, trailing, to }) {
  const content = (
    <>
      <div className={styles.text}>
        <span className={styles.title}>{title}</span>
        {detail && <span className={styles.detail}>{detail}</span>}
      </div>
      {trailing && <div className={styles.trailing}>{trailing}</div>}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={`${styles.row} ${styles.link}`}>
        {content}
      </Link>
    );
  }
  return <div className={styles.row}>{content}</div>;
}
