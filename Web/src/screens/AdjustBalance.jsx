import { Link, useNavigate, useParams } from 'react-router';
import { useAccount } from '../hooks/useAccounts.js';
import { useCreateAdjustment } from '../hooks/useAdjustments.js';
import { useForm } from '../hooks/useForm.js';
import { Card } from '../components/Card.jsx';
import { Field } from '../components/Field.jsx';
import { MoneyInput } from '../components/MoneyInput.jsx';
import { Choices } from '../components/Choices.jsx';
import { Button } from '../components/Button.jsx';
import { today } from '../days.js';
import formStyles from './FormScreen.module.css';
import styles from './AdjustBalance.module.css';

// Asked the way you notice the problem. `in` raises a balance; on a card it
// lowers what you owe, so the same word means the opposite sentence.
const BALANCE_OPTIONS = [
  ['in', "There's more in it than the app shows"],
  ['out', "There's less in it than the app shows"],
];
const CARD_OPTIONS = [
  ['out', 'I owe more than the app shows'],
  ['in', 'I owe less than the app shows'],
];
const FIELD_ORDER = ['direction', 'amount', 'date', 'note'];

// Checked before sending, with the same rules as the server. Nothing is
// picked for you: guessing the direction would record money the wrong way.
function findProblems({ direction, amount, date, note }) {
  const problems = {};
  if (!direction) problems.direction = 'Pick one';
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || !/[1-9]/.test(amount)) problems.amount = 'Enter how much, more than 0';
  if (!date) problems.date = 'Pick the day';
  if (!note.trim()) problems.note = "Say why — you'll want to know later";
  return problems;
}

function AdjustForm({ account }) {
  const createAdjustment = useCreateAdjustment(account.id);
  const navigate = useNavigate();
  const { change, fieldProps, submit } = useForm({
    initial: () => ({ direction: '', amount: '', date: today(), note: '' }),
    findProblems,
    fieldOrder: FIELD_ORDER,
    onValid: (adjustment) => createAdjustment.mutate(
      { ...adjustment, note: adjustment.note.trim() },
      { onSuccess: () => navigate(`/accounts/${account.id}`) },
    ),
  });
  const isCard = account.kind === 'credit_card';

  return (
    <form className={formStyles.form} onSubmit={submit} noValidate>
      <Choices
        legend="What's wrong?"
        options={isCard ? CARD_OPTIONS : BALANCE_OPTIONS}
        wide
        {...fieldProps('direction')}
        onChange={(direction) => change('direction', direction)}
      />
      <MoneyInput label="By how much?" {...fieldProps('amount')} onChange={(amount) => change('amount', amount)} />
      <Field label="On which day?" type="date" hint="Usually today" {...fieldProps('date')} />
      <Field label="Why?" hint="Like: bank charges I never logged" autoComplete="off" {...fieldProps('note')} />
      {createAdjustment.error && <p className={formStyles.error} role="alert">{createAdjustment.error.message}</p>}
      <Button type="submit" wide disabled={createAdjustment.isPending}>
        {createAdjustment.isPending ? 'Saving…' : 'Correct the balance'}
      </Button>
    </form>
  );
}

export function AdjustBalance() {
  const { id } = useParams();
  const account = useAccount(id);
  if (account.isPending) return <main className={formStyles.screen} />;
  if (account.isError) {
    return (
      <main className={formStyles.screen}>
        <p>{account.error.status === 404 ? "We couldn't find that account." : account.error.message}</p>
        <Link to="/">Go to home</Link>
      </main>
    );
  }
  return (
    <main className={formStyles.screen}>
      <Link to={`/accounts/${id}`} className={styles.back}>{account.data.name}</Link>
      <h1 className={formStyles.title}>Correct the balance</h1>
      <p className={styles.lead}>
        For when the balance was right once and has drifted from your bank since.
      </p>
      <Card>
        <AdjustForm account={account.data} />
      </Card>
    </main>
  );
}
