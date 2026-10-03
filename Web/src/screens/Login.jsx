import { Link, Navigate, useLocation } from 'react-router';
import { useCurrentUser, useLogin } from '../hooks/useAuth.js';
import { useForm } from '../hooks/useForm.js';
import { Card } from '../components/Card.jsx';
import { Field } from '../components/Field.jsx';
import { Button } from '../components/Button.jsx';
import styles from './FormScreen.module.css';

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+$/;

// Checked before sending. Problems found here sit beside their field.
function findProblems({ email, password }) {
  const problems = {};
  if (!EMAIL_SHAPE.test(email.trim())) problems.email = 'Enter your email';
  if (!password) problems.password = 'Enter your password';
  return problems;
}

export function Login() {
  const { data: user } = useCurrentUser();
  const login = useLogin();
  const location = useLocation();
  const { fieldProps, submit } = useForm({
    initial: { email: '', password: '' },
    findProblems,
    fieldOrder: ['email', 'password'],
    onValid: (values) => login.mutate(values),
  });

  // Once logged in, go back to wherever the login check sent them from.
  if (user) return <Navigate to={location.state?.from ?? '/'} replace />;

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Log in to HisabKitab</h1>
      <Card>
        <form className={styles.form} onSubmit={submit} noValidate>
          <Field label="Email" type="email" autoComplete="email" {...fieldProps('email')} />
          <Field label="Password" type="password" autoComplete="current-password" {...fieldProps('password')} />
          {/* Never tied to a field: saying which one was wrong would reveal which emails have accounts. */}
          {login.error && <p className={styles.error} role="alert">{login.error.message}</p>}
          <Button type="submit" wide disabled={login.isPending}>
            {login.isPending ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
      </Card>
      <p className={styles.switch}>
        New here? <Link to="/register" state={location.state}>Create an account</Link>
      </p>
    </main>
  );
}
