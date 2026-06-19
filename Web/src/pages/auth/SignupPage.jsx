import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../../lib/firebase';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFirebaseUser = async (firebaseUser) => {
    const token = await firebaseUser.getIdToken();
    const res = await api.post('/auth/login', { token });
    setAuth(res.data.token, res.data.user);
    navigate('/home', { replace: true });
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await handleFirebaseUser(result.user);
        } else if (active) {
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(t('auth.err_google'));
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signupWithEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await handleFirebaseUser(user);
    } catch (err) {
      setError(
        err.code === 'auth/email-already-in-use'
          ? t('auth.err_email_used')
          : t('auth.err_create')
      );
    } finally {
      setLoading(false);
    }
  };

  const signupWithGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithRedirect(auth, new GoogleAuthProvider());
    } catch {
      setError(t('auth.err_google'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-primary-600 mb-1">HisabKitab</h1>
        <p className="text-center text-gray-400 text-sm mb-8">{t('auth.tagline_signup')}</p>

        <form onSubmit={signupWithEmail} className="flex flex-col gap-4">
          <Input
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label={t('auth.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t('auth.creating') : t('auth.signup')}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('common.or')}</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        <Button variant="outline" onClick={signupWithGoogle} disabled={loading} className="w-full">
          {t('auth.google')}
        </Button>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">
          {t('auth.have_account')}{' '}
          <Link to="/login" className="text-primary-600 font-medium">
            {t('auth.signin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
