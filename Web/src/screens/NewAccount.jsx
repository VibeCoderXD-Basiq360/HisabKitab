import { useNavigate } from 'react-router';
import { useCreateAccount } from '../hooks/useAccounts.js';
import { useForm } from '../hooks/useForm.js';
import { Card } from '../components/Card.jsx';
import { Field } from '../components/Field.jsx';
import { MoneyInput } from '../components/MoneyInput.jsx';
import { Button } from '../components/Button.jsx';
import { Choices } from '../components/Choices.jsx';
import { today } from '../days.js';
import formStyles from './FormScreen.module.css';
import { CardFields, findAccountProblems } from './AccountFields.jsx';

const KIND_CHOICES = [
  ['bank', 'Bank'],
  ['cash', 'Cash'],
  ['wallet', 'Wallet'],
  ['credit_card', 'Credit card'],
];
const EMPTY_FORM = { kind: 'bank', name: '', openingDate: '', opening: '', lastFour: '', billingDay: '', dueDay: '' };
// The order the fields appear on screen, so focus goes to the first problem.
const FIELD_ORDER = ['name', 'openingDate', 'opening', 'lastFour', 'billingDay', 'dueDay'];

// Adding also asks for the start date; everything else is checked the same
// way as editing.
function findProblems(values) {
  const problems = findAccountProblems(values);
  if (!values.openingDate) problems.openingDate = 'Pick the day you start from';
  return problems;
}

// A card sends what you owe as `openingOutstanding`; everything else sends
// what is in it as `openingBalance`. Money stays text throughout.
function toRequest(form) {
  const common = { name: form.name.trim(), kind: form.kind, openingDate: form.openingDate };
  if (form.kind !== 'credit_card') return { ...common, openingBalance: form.opening };
  return {
    ...common,
    openingOutstanding: form.opening,
    lastFour: form.lastFour,
    billingDay: Number(form.billingDay),
    dueDay: Number(form.dueDay),
  };
}

export function NewAccount() {
  const createAccount = useCreateAccount();
  const navigate = useNavigate();
  const { values, change, fieldProps, submit } = useForm({
    initial: () => ({ ...EMPTY_FORM, openingDate: today() }),
    findProblems,
    fieldOrder: FIELD_ORDER,
    onValid: (account) => createAccount.mutate(toRequest(account), { onSuccess: () => navigate('/') }),
  });
  const isCard = values.kind === 'credit_card';

  return (
    <main className={formStyles.screen}>
      <h1 className={formStyles.title}>Add an account</h1>
      <Card>
        <form className={formStyles.form} onSubmit={submit} noValidate>
          <Choices
            legend="What kind of account?"
            options={KIND_CHOICES}
            value={values.kind}
            onChange={(kind) => change('kind', kind)}
          />
          <Field label="Name" hint="As you'd say it, like HDFC savings" autoComplete="off" {...fieldProps('name')} />
          <Field label="Start tracking from" type="date" {...fieldProps('openingDate')} />
          <MoneyInput
            label={isCard ? 'How much did you owe on it that day?' : 'How much was in it that day?'}
            {...fieldProps('opening')}
            onChange={(value) => change('opening', value)}
          />
          {isCard && <CardFields fieldProps={fieldProps} />}
          {createAccount.error && <p className={formStyles.error} role="alert">{createAccount.error.message}</p>}
          <Button type="submit" wide disabled={createAccount.isPending}>
            {createAccount.isPending ? 'Adding…' : 'Add account'}
          </Button>
        </form>
      </Card>
      <Button quiet wide onClick={() => navigate('/')}>Cancel</Button>
    </main>
  );
}
