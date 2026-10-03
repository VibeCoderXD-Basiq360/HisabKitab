import { Link, useNavigate, useParams } from 'react-router';
import { useAccount, useLedger } from '../hooks/useAccounts.js';
import { useAdjustments } from '../hooks/useAdjustments.js';
import { Card } from '../components/Card.jsx';
import { Row } from '../components/Row.jsx';
import { Amount } from '../components/Amount.jsx';
import { Button } from '../components/Button.jsx';
import { dayWithSuffix } from '../days.js';
import { kindLabel, headlineFigure, describeLedgerEntry } from '../describeAccount.js';
import styles from './AccountDetail.module.css';

function Summary({ account }) {
  const { word, amount } = headlineFigure(account);
  return (
    <Card>
      <h1 className={styles.name}>{account.name}</h1>
      <p className={styles.quiet}>{kindLabel(account)}</p>
      <p className={styles.headline}>
        <Amount value={amount} large /> <span className={styles.quiet}>{word}</span>
      </p>
      {account.kind === 'credit_card' && (
        <p className={styles.quiet}>Bill due on the {dayWithSuffix(account.dueDay)}</p>
      )}
      {account.archivedAt && <p className={styles.quiet}>Archived — kept for its history.</p>}
    </Card>
  );
}

function Ledger({ account }) {
  const ledger = useLedger(account.id);
  const adjustments = useAdjustments(account.id);
  if (ledger.isPending) return <p className={styles.quiet}>Loading what moved…</p>;
  if (ledger.isError) return <p className={styles.quiet}>{ledger.error.message}</p>;

  // Corrections are titled by their note, which the ledger itself doesn't carry.
  const notes = new Map((adjustments.data ?? []).map((adjustment) => [adjustment.id, adjustment.note]));
  const entries = ledger.data.pages.flatMap((page) => page.entries);
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Money in and out</h2>
      <Card>
        {entries.map((entry) => {
          const line = describeLedgerEntry(account, entry, notes);
          const figure = (
            <span className={styles.figure}>
              <Amount value={entry.amount} />
              <span className={styles.quiet}>{line.word}</span>
            </span>
          );
          return <Row key={`${entry.source}-${entry.sourceId}`} title={line.title} detail={line.detail} trailing={figure} />;
        })}
      </Card>
      {ledger.hasNextPage && (
        <Button quiet wide disabled={ledger.isFetchingNextPage} onClick={() => ledger.fetchNextPage()}>
          {ledger.isFetchingNextPage ? 'Loading…' : 'Show more'}
        </Button>
      )}
    </section>
  );
}

export function AccountDetail() {
  const { id } = useParams();
  const account = useAccount(id);
  const navigate = useNavigate();

  if (account.isPending) return <main className={styles.screen} />;
  if (account.isError) {
    const missing = account.error.status === 404;
    return (
      <main className={styles.screen}>
        <p>{missing ? "We couldn't find that account." : account.error.message}</p>
        <Link to="/">Go to home</Link>
      </main>
    );
  }
  return (
    <main className={styles.screen}>
      <Link to="/" className={styles.back}>Home</Link>
      <Summary account={account.data} />
      {!account.data.archivedAt && (
        <Button wide onClick={() => navigate(`/accounts/${id}/adjust`)}>Correct the balance</Button>
      )}
      <Ledger account={account.data} />
    </main>
  );
}
