import { Link, Navigate, useLocation } from 'react-router';
import { useCurrentUser, useRegister } from '../hooks/useAuth.js';
import { useForm } from '../hooks/useForm.js';
import { Card } from '../components/Card.jsx';
import { Field } from '../components/Field.jsx';
import { Button } from '../components/Button.jsx';
import styles from './FormScreen.module.css';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Checked before sending, with the same rules as the server. Problems found
// here sit beside their field.
function findProblems({ displayName, email, password }) {
  const problems = {};
  if (!displayName.trim()) problems.displayName = 'Enter your name';
  if (!EMAIL_SHAPE.test(email.trim())) problems.email = 'Enter an email like name@example.com';
  if (password.length < MIN_PASSWORD_LENGTH) problems.password = 'Use at least 8 characters';
  return problems;
}

export function Register() {
  const { data: user } = useCurrentUser();
  const register = useRegister();
  const location = useLocation();
  const { fieldProps, submit } = useForm({
    initial: { displayName: '', email: '', password: '' },
    findProblems,
    fieldOrder: ['displayName', 'email', 'password'],
    onValid: (values) => register.mutate(values),
  });

  if (user) return <Navigate to={location.state?.from ?? '/'} replace />;

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Create your account</h1>
      <Card>
        <form className={styles.form} onSubmit={submit} noValidate>
          <Field label="Your name" autoComplete="name" {...fieldProps('displayName')} />
          <Field label="Email" type="email" autoComplete="email" {...fieldProps('email')} />
          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters"
            {...fieldProps('password')}
          />
          {register.error && <p className={styles.error} role="alert">{register.error.message}</p>}
          <Button type="submit" wide disabled={register.isPending}>
            {register.isPending ? 'Creating your account…' : 'Create account'}
          </Button>
        </form>
      </Card>
      <p className={styles.switch}>
        Already have one? <Link to="/login" state={location.state}>Log in</Link>
      </p>
    </main>
  );
}
