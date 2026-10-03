import { Link, useNavigate, useParams } from 'react-router';
import { useAccount, useEditAccount } from '../hooks/useAccounts.js';
import { useForm } from '../hooks/useForm.js';
import { Card } from '../components/Card.jsx';
import { Field } from '../components/Field.jsx';
import { MoneyInput } from '../components/MoneyInput.jsx';
import { Button } from '../components/Button.jsx';
import { formatDay } from '../days.js';
import { kindLabel } from '../describeAccount.js';
import formStyles from './FormScreen.module.css';
import styles from './EditAccount.module.css';
import { CardFields, findAccountProblems } from './AccountFields.jsx';

// The order the fields appear on screen, so focus goes to the first problem.
const FIELD_ORDER = ['name', 'opening', 'lastFour', 'billingDay', 'dueDay'];

function initialValues(account) {
  const isCard = account.kind === 'credit_card';
  return {
    kind: account.kind,
    name: account.name,
    opening: isCard ? account.openingOutstanding : account.openingBalance,
    lastFour: isCard ? account.lastFour : '',
    billingDay: isCard ? String(account.billingDay) : '',
    dueDay: isCard ? String(account.dueDay) : '',
  };
}

// Only what can change. Kind and start date are fixed once an account exists.
function toChanges(values) {
  const name = values.name.trim();
  if (values.kind !== 'credit_card') return { name, openingBalance: values.opening };
  return {
    name,
    openingOutstanding: values.opening,
    lastFour: values.lastFour,
    billingDay: Number(values.billingDay),
    dueDay: Number(values.dueDay),
  };
}

function EditForm({ account }) {
  const editAccount = useEditAccount(account.id);
  const navigate = useNavigate();
  const { change, fieldProps, submit } = useForm({
    initial: () => initialValues(account),
    findProblems: findAccountProblems,
    fieldOrder: FIELD_ORDER,
    onValid: (values) => editAccount.mutate(toChanges(values), { onSuccess: () => navigate(`/accounts/${account.id}`) }),
  });
  const isCard = account.kind === 'credit_card';
  const startDay = formatDay(account.openingDate);

  return (
    <form className={formStyles.form} onSubmit={submit} noValidate>
      <p className={styles.fixed}>
        {kindLabel(account)}, tracked from {startDay}. These can't change.
      </p>
      <Field label="Name" autoComplete="off" {...fieldProps('name')} />
      <MoneyInput
        label={isCard ? `How much did you owe on it on ${startDay}?` : `How much was in it on ${startDay}?`}
        hint="Change this only if it was wrong from the start. If the balance has drifted since, correct the balance instead."
        {...fieldProps('opening')}
        onChange={(opening) => change('opening', opening)}
      />
      {isCard && <CardFields fieldProps={fieldProps} />}
      {editAccount.error && <p className={formStyles.error} role="alert">{editAccount.error.message}</p>}
      <Button type="submit" wide disabled={editAccount.isPending}>
        {editAccount.isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}

export function EditAccount() {
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
      <h1 className={formStyles.title}>Edit details</h1>
      <Card>
        {account.data.archivedAt ? (
          <p className={styles.fixed}>Archived accounts can't be edited. Their history stays as it was.</p>
        ) : (
          <EditForm account={account.data} />
        )}
      </Card>
    </main>
  );
}
