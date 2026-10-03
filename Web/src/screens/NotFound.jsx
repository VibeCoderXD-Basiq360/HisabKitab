import { Link } from 'react-router';
import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Nothing here</h1>
      <p className={styles.text}>This address doesn't match any screen in HisabKitab.</p>
      <Link to="/">Go to home</Link>
    </main>
  );
}
