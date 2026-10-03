import { Field } from '../components/Field.jsx';
import styles from './AccountFields.module.css';

// What adding and editing an account share: the card's extra fields, and
// the checks both forms run — the same rules as the server, in one place so
// the two forms can't drift apart.

function isDayOfMonth(text) {
  return /^\d{1,2}$/.test(text) && Number(text) >= 1 && Number(text) <= 31;
}

export function findAccountProblems(values) {
  const problems = {};
  if (!values.name.trim()) problems.name = 'Give it a name';
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(values.opening)) problems.opening = 'Enter an amount, like 1200 or 0';
  if (values.kind !== 'credit_card') return problems;
  if (!/^\d{4}$/.test(values.lastFour)) problems.lastFour = 'Enter the last 4 digits';
  if (!isDayOfMonth(values.billingDay)) problems.billingDay = 'A day from 1 to 31';
  if (!isDayOfMonth(values.dueDay)) problems.dueDay = 'A day from 1 to 31';
  return problems;
}

export function CardFields({ fieldProps }) {
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
