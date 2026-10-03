import { Link } from 'react-router';
import { Amount } from '../components/Amount.jsx';
import { dayWithSuffix } from '../days.js';
import { kindLabel, headlineFigure } from '../describeAccount.js';
import styles from './AccountStack.module.css';

// Wallet has no colour token of its own; it shares cash's — both are money in hand.
const FACES = { bank: styles.bank, credit_card: styles.card, cash: styles.cash, wallet: styles.cash };

function AccountCard({ account, position }) {
  const { word, amount } = headlineFigure(account);
  const className = `${styles.face} ${FACES[account.kind]} ${styles[position]}`;
  const face = (
    <>
      <div className={styles.top}>
        <span className={styles.name}>{account.name}</span>
        <span className={styles.quiet}>{kindLabel(account)}</span>
      </div>
      <div className={styles.bottom}>
        <Amount value={amount} large />
        <span className={styles.quiet}>{word}</span>
        {account.kind === 'credit_card' && (
          <span className={styles.quiet}>Bill due on the {dayWithSuffix(account.dueDay)}</span>
        )}
      </div>
    </>
  );
  // The front card opens the account. The cards behind are decoration:
  // everything on them is in the list below.
  if (position !== 'front') {
    return <article className={className} aria-hidden="true">{face}</article>;
  }
  return (
    <Link to={`/accounts/${account.id}`} className={`${className} ${styles.link}`}>
      {face}
    </Link>
  );
}

// The home hero: the first account in front, up to two more peeking out
// behind it. No total — this app leads with accounts, not one big number.
export function AccountStack({ accounts }) {
  const [front, second, third] = accounts;
  if (!front) {
    return (
      <div className={styles.stack}>
        <article className={`${styles.face} ${styles.empty} ${styles.front}`}>
          <span className={styles.name}>No accounts yet</span>
          <span className={styles.quiet}>Your first one will show up here.</span>
        </article>
      </div>
    );
  }
  return (
    <div className={styles.stack}>
      {third && <AccountCard account={third} position="third" />}
      {second && <AccountCard account={second} position="second" />}
      <AccountCard account={front} position="front" />
    </div>
  );
}
