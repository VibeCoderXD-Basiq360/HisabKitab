import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCreateAccount } from '../hooks/useAccounts.js';
import { Card } from '../components/Card.jsx';
import { Field } from '../components/Field.jsx';
import { MoneyInput } from '../components/MoneyInput.jsx';
import { Button } from '../components/Button.jsx';
import { today } from '../days.js';
import formStyles from './FormScreen.module.css';
import styles from './NewAccount.module.css';

const KIND_CHOICES = [
  ['bank', 'Bank'],
  ['cash', 'Cash'],
  ['wallet', 'Wallet'],
  ['credit_card', 'Credit card'],
];
const EMPTY_FORM = { kind: 'bank', name: '', openingDate: '', opening: '', lastFour: '', billingDay: '', dueDay: '' };
// The order the fields appear on screen, so focus goes to the first problem.
const FIELD_ORDER = ['name', 'openingDate', 'opening', 'lastFour', 'billingDay', 'dueDay'];

function isDayOfMonth(text) {
  return /^\d{1,2}$/.test(text) && Number(text) >= 1 && Number(text) <= 31;
}

// Checked before sending, with the same rules as the server.
function findProblems(form) {
  const problems = {};
  if (!form.name.trim()) problems.name = 'Give it a name';
  if (!form.openingDate) problems.openingDate = 'Pick the day you start from';
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(form.opening)) problems.opening = 'Enter an amount, like 1200 or 0';
  if (form.kind !== 'credit_card') return problems;
  if (!/^\d{4}$/.test(form.lastFour)) problems.lastFour = 'Enter the last 4 digits';
  if (!isDayOfMonth(form.billingDay)) problems.billingDay = 'A day from 1 to 31';
  if (!isDayOfMonth(form.dueDay)) problems.dueDay = 'A day from 1 to 31';
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

function KindPicker({ value, onChange }) {
  return (
    <fieldset className={styles.picker}>
      <legend className={styles.legend}>What kind of account?</legend>
      <div className={styles.choices}>
        {KIND_CHOICES.map(([kind, label]) => (
          <label key={kind} className={styles.choice}>
            <input
              type="radio"
              name="kind"
              className={styles.radio}
              checked={value === kind}
              onChange={() => onChange(kind)}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CardFields({ fieldProps }) {
  return (
    <>
      <Field label="Last 4 digits of the card" inputMode="numeric" {...fieldProps('lastFour', 4)} />
      <div className={styles.days}>
        <Field label="Day the bill comes" hint="1 to 31" inputMode="numeric" {...fieldProps('billingDay', 2)} />
        <Field label="Day it's due" hint="1 to 31" inputMode="numeric" {...fieldProps('dueDay', 2)} />
      </div>
    </>
  );
}

// The form's state, its checks, and submitting it. Kept apart from the
// screen so each stays short enough to read in one go.
function useAccountForm(onValid) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, openingDate: today() }));
  const [problems, setProblems] = useState({});
  const inputs = useRef({});

  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  // What every field needs: its value, its problem, a way to focus it, and —
  // for digit-only fields — a limit on what can be typed.
  const fieldProps = (field, maxDigits) => ({
    ref: (element) => { inputs.current[field] = element; },
    value: form[field],
    error: problems[field],
    onChange: (event) => {
      const typed = event.target.value;
      if (maxDigits && (!/^\d*$/.test(typed) || typed.length > maxDigits)) return;
      change(field, typed);
    },
  });

  function submit(event) {
    event.preventDefault();
    const found = findProblems(form);
    setProblems(found);
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) return inputs.current[first].focus();
    onValid(toRequest(form));
  }

  return { form, change, fieldProps, submit };
}

export function NewAccount() {
  const createAccount = useCreateAccount();
  const navigate = useNavigate();
  const { form, change, fieldProps, submit } = useAccountForm((account) => {
    createAccount.mutate(account, { onSuccess: () => navigate('/') });
  });
  const isCard = form.kind === 'credit_card';

  return (
    <main className={formStyles.screen}>
      <h1 className={formStyles.title}>Add an account</h1>
      <Card>
        <form className={formStyles.form} onSubmit={submit} noValidate>
          <KindPicker value={form.kind} onChange={(kind) => change('kind', kind)} />
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
