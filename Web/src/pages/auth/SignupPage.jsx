import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../../lib/firebase';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

/* ─── Shared input style ─── */
const inputBase = {
  width: '100%',
  background: '#F0F2F7',
  border: '1.5px solid #E9ECF0',
  borderRadius: 12,
  padding: '12px 16px',
  fontSize: 15,
  color: '#0A0D14',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

function StyledInput({ label, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
          {label}
        </label>
      )}
      <input
        {...props}
        style={{ ...inputBase, borderColor: focused ? '#00C2B2' : '#E9ECF0' }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

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

  const signupWithGoogle = () => {
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
          await handleFirebaseUser(user);
        } catch {
          setError(t('auth.err_google'));
          setLoading(false);
        }
      },
    });

    tokenClient.requestAccessToken();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#F0F2F7' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <img src="/logo.jpg" alt="HisabKitab" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} />
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A0D14', margin: 0 }}>HisabKitab</h1>
          </div>
          <p style={{ fontSize: 14, color: '#B0B8C4', margin: 0 }}>{t('auth.tagline_signup')}</p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 22, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <form onSubmit={signupWithEmail} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StyledInput
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <StyledInput
              label={t('auth.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={6}
              required
            />

            {error && <p style={{ fontSize: 13, color: '#E11D48', margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#00C2B2,#009E90)', color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4 }}
            >
              {loading ? t('auth.creating') : t('auth.signup')}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#E9ECF0' }} />
            <span style={{ fontSize: 12, color: '#B0B8C4' }}>{t('common.or')}</span>
            <div style={{ flex: 1, height: 1, background: '#E9ECF0' }} />
          </div>

          {/* Google button */}
          <button
            type="button"
            onClick={signupWithGoogle}
            disabled={loading}
            style={{ width: '100%', height: 52, borderRadius: 12, background: '#fff', border: '1.5px solid #E9ECF0', color: '#0A0D14', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {t('auth.google')}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: '#B0B8C4', marginTop: 20 }}>
          {t('auth.have_account')}{' '}
          <Link to="/login" style={{ color: '#00C2B2', fontWeight: 700, textDecoration: 'none' }}>
            {t('auth.signin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
