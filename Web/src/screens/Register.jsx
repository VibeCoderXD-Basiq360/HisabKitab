import { useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router';
import { useCurrentUser, useRegister } from '../hooks/useAuth.js';
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
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [problems, setProblems] = useState({});
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  if (user) return <Navigate to={location.state?.from ?? '/'} replace />;

  function submit(event) {
    event.preventDefault();
    const found = findProblems({ displayName, email, password });
    setProblems(found);
    if (found.displayName) return nameRef.current.focus();
    if (found.email) return emailRef.current.focus();
    if (found.password) return passwordRef.current.focus();
    register.mutate({ displayName, email, password });
  }

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>Create your account</h1>
      <Card>
        <form className={styles.form} onSubmit={submit} noValidate>
          <Field
            ref={nameRef}
            label="Your name"
            autoComplete="name"
            error={problems.displayName}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <Field
            ref={emailRef}
            label="Email"
            type="email"
            autoComplete="email"
            error={problems.email}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Field
            ref={passwordRef}
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters"
            error={problems.password}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
