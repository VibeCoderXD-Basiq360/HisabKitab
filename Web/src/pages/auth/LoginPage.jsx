import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../../lib/firebase';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFirebaseLogin = async (firebaseUser) => {
    const token = await firebaseUser.getIdToken();
    const res = await api.post('/auth/login', { token });
    setAuth(res.data.token, res.data.user);
    navigate('/home', { replace: true });
  };

  const loginWithEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await handleFirebaseLogin(user);
    } catch {
      setError(t('auth.err_invalid'));
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => {
    if (!window.google?.accounts?.oauth2) {
      setError('Google Sign-In failed to load. Please refresh and try again.');
      return;
    }
    setLoading(true);
    setError('');

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: 'email profile',
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          setError(t('auth.err_google'));
          setLoading(false);
          return;
        }
        try {
          const credential = GoogleAuthProvider.credential(null, tokenResponse.access_token);
          const { user } = await signInWithCredential(auth, credential);
          await handleFirebaseLogin(user);
        } catch {
          setError(t('auth.err_google'));
          setLoading(false);
        }
      },
    });

    tokenClient.requestAccessToken();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-primary-600 mb-1">HisabKitab</h1>
        <p className="text-center text-gray-400 dark:text-gray-500 text-sm mb-8">{t('auth.tagline_login')}</p>

        <form onSubmit={loginWithEmail} className="flex flex-col gap-4">
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
            autoComplete="current-password"
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t('auth.signing_in') : t('auth.signin')}
          </Button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('common.or')}</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        <Button variant="outline" onClick={loginWithGoogle} disabled={loading} className="w-full">
          {t('auth.google')}
        </Button>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-4">
          <Link to="/forgot-password" className="text-primary-600 font-medium">
            {t('auth.forgot_password')}
          </Link>
        </p>

        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-3">
          {t('auth.no_account')}{' '}
          <Link to="/signup" className="text-primary-600 font-medium">
            {t('auth.signup')}
          </Link>
        </p>
      </div>
    </div>
  );
}
