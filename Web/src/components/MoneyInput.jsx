import { Field } from './Field.jsx';

// Digits and at most two after the point. The value stays a string end to
// end — it is never turned into a number.
const TYPED_MONEY = /^\d{0,10}(\.\d{0,2})?$/;

export function MoneyInput({ value, onChange, ...fieldProps }) {
  function handleTyping(event) {
    if (TYPED_MONEY.test(event.target.value)) onChange(event.target.value);
  }
  return <Field prefix="₹" inputMode="decimal" autoComplete="off" value={value} onChange={handleTyping} {...fieldProps} />;
}
