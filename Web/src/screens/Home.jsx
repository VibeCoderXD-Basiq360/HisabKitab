import { useNavigate } from 'react-router';
import { useAccounts } from '../hooks/useAccounts.js';
import { Card } from '../components/Card.jsx';
import { Row } from '../components/Row.jsx';
import { Amount } from '../components/Amount.jsx';
import { Button } from '../components/Button.jsx';
import { kindLabel, headlineFigure } from '../describeAccount.js';
import { AccountStack } from './AccountStack.jsx';
import styles from './Home.module.css';

function AccountList({ accounts }) {
  return (
    <Card>
      {accounts.map((account) => {
        const { word, amount } = headlineFigure(account);
        const figure = (
          <span className={styles.figure}>
            <Amount value={amount} />
            <span className={styles.word}>{word}</span>
          </span>
        );
        return <Row key={account.id} title={account.name} detail={kindLabel(account)} trailing={figure} />;
      })}
    </Card>
  );
}

export function Home() {
  const accounts = useAccounts();
  const navigate = useNavigate();
  const hasAccounts = accounts.isSuccess && accounts.data.length > 0;
  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Your accounts</h1>
      {accounts.isPending && <p className={styles.message}>Loading your accounts…</p>}
      {accounts.isError && <p className={styles.message}>{accounts.error.message}</p>}
      {accounts.isSuccess && <AccountStack accounts={accounts.data} />}
      {hasAccounts && <AccountList accounts={accounts.data} />}
      <Button wide onClick={() => navigate('/accounts/new')}>Add an account</Button>
    </main>
  );
}
