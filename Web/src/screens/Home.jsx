import { useCurrentUser } from '../hooks/useAuth.js';
import styles from './Home.module.css';

// Placeholder until block 2 builds the real home screen.
export function Home() {
  const { data: user } = useCurrentUser();
  return (
    <main className={styles.screen}>
      <p>Logged in as {user.displayName}. Your accounts arrive in the next block.</p>
    </main>
  );
}
