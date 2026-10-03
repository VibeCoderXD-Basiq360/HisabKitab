import { useRef, useState } from 'react';

// The shape every form shares. Each form brings its starting values, its own
// checks, the order its fields appear on screen, and what to do with values
// that pass. This keeps the values, shows each problem beside its field, and
// moves focus to the first one.
export function useForm({ initial, findProblems, fieldOrder, onValid }) {
  const [values, setValues] = useState(initial);
  const [problems, setProblems] = useState({});
  const inputs = useRef({});

  const change = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  // What a Field needs: its value, its problem, and a way to focus it.
  // `maxDigits` makes a field digits-only, refusing anything longer as it's typed.
  const fieldProps = (field, maxDigits) => ({
    ref: (element) => {
      inputs.current[field] = element;
    },
    value: values[field],
    error: problems[field],
    onChange: (event) => {
      const typed = event.target.value;
      if (maxDigits && (!/^\d*$/.test(typed) || typed.length > maxDigits)) return;
      change(field, typed);
    },
  });

  function submit(event) {
    event.preventDefault();
    const found = findProblems(values);
    setProblems(found);
    const first = fieldOrder.find((field) => found[field]);
    if (first) return inputs.current[first].focus();
    onValid(values);
  }

  return { values, change, fieldProps, submit };
}
