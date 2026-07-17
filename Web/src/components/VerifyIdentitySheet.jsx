import { useState } from 'react';
import { auth } from '../lib/firebase';
import { reauthenticateWithCredential, EmailAuthProvider, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import {
  useBiometricSupported,
  useWebAuthnCredentials,
  useAuthenticateBiometric,
  useRegisterBiometric,
  useFirebaseActionToken,
} from '../hooks/useWebAuthn';

/**
 * Identity verification bottom sheet.
 * Props:
 *   title?       — override sheet title
 *   description? — override description
 *   onVerified(actionToken) — called with server-issued action token (valid 5 min)
 *   onClose()   — called to dismiss without verifying
 */
export default function VerifyIdentitySheet({ title, description, onVerified, onClose }) {
  const { data: biometricSupported } = useBiometricSupported();
  const { data: credentials = [] }   = useWebAuthnCredentials();
  const authenticateBiometric        = useAuthenticateBiometric();
  const registerBiometric            = useRegisterBiometric();
  const firebaseActionToken          = useFirebaseActionToken();

  const hasBiometric   = credentials.length > 0;
  const canRegister    = biometricSupported && !hasBiometric;
  const user           = auth.currentUser;
  const isGoogle       = user?.providerData?.[0]?.providerId === 'google.com';

  const [view, setView]           = useState('main');   // 'main' | 'password' | 'register'
  const [password, setPassword]   = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const handleError = (msg) => { setError(msg); setLoading(false); };

  // ── Biometric authenticate ────────────────────────────────────────────────
  const handleBiometric = async () => {
    setError('');
    setLoading(true);
    try {
      const { actionToken } = await authenticateBiometric.mutateAsync();
      onVerified(actionToken);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Biometric failed';
      if (msg.includes('notRegistered') || err?.response?.data?.notRegistered) {
        setView('register');
      } else {
        handleError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Register biometric ───────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerBiometric.mutateAsync(deviceName.trim() || undefined);
      setView('main');
      handleBiometric();
    } catch (err) {
      handleError(err?.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Password / Google re-auth ─────────────────────────────────────────────
  const handleFirebaseReauth = async (freshToken) => {
    setLoading(true);
    setError('');
    try {
      const { actionToken } = await firebaseActionToken.mutateAsync(freshToken);
      onVerified(actionToken);
    } catch (err) {
      handleError(err?.response?.data?.error || 'Verification failed');
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      const freshToken = await user.getIdToken(true);
      await handleFirebaseReauth(freshToken);
    } catch (err) {
      if (err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential') {
        handleError('Incorrect password. Please try again.');
      } else {
        handleError(err?.message || 'Verification failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
      const freshToken = await user.getIdToken(true);
      await handleFirebaseReauth(freshToken);
    } catch {
      handleError('Google verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const inputStyle = {
    minHeight: 48,
    padding: '0 16px',
    borderRadius: 16,
    border: '1.5px solid #E9ECF0',
    background: '#F0F2F7',
    fontSize: 14,
    color: '#0A0D14',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const primaryBtnStyle = {
    width: '100%',
    padding: '14px 0',
    borderRadius: 16,
    background: 'linear-gradient(135deg, #00C2B2, #009E90)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 14,
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    transition: 'transform 0.1s',
  };

  const outlineBtnStyle = {
    width: '100%',
    padding: '14px 0',
    borderRadius: 16,
    border: '2px solid #E9ECF0',
    background: '#fff',
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  const renderMain = () => (
    <>
      <div className="text-center">
        <div className="text-5xl mb-3">🔐</div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0D14' }}>
          {title || 'Verify your identity'}
        </h2>
        <p style={{ fontSize: 12, color: '#B0B8C4', marginTop: 6, lineHeight: 1.6 }}>
          {description || 'This sensitive action requires identity verification'}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Biometric / fingerprint */}
        {biometricSupported && hasBiometric && (
          <button
            onClick={handleBiometric}
            disabled={loading}
            style={{ ...primaryBtnStyle, opacity: loading ? 0.5 : 1 }}
          >
            <span className="text-2xl">☝️</span>
            {loading ? 'Authenticating…' : 'Use fingerprint / Face ID'}
          </button>
        )}

        {/* Register biometric CTA */}
        {canRegister && (
          <button
            onClick={() => setView('register')}
            style={{
              ...outlineBtnStyle,
              borderStyle: 'dashed',
              borderColor: '#00C2B2',
              color: '#00C2B2',
            }}
          >
            <span className="text-xl">☝️</span>
            Set up fingerprint / Face ID
          </button>
        )}

        {/* Divider */}
        {biometricSupported && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: '#E9ECF0' }} />
            <span style={{ fontSize: 12, color: '#B0B8C4' }}>or</span>
            <div className="flex-1 h-px" style={{ background: '#E9ECF0' }} />
          </div>
        )}

        {/* Password / Google */}
        {isGoogle ? (
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{ ...outlineBtnStyle, opacity: loading ? 0.5 : 1 }}
          >
            <span className="text-xl font-bold" style={{ color: '#4285F4' }}>G</span>
            {loading ? 'Verifying…' : 'Verify with Google'}
          </button>
        ) : (
          <button
            onClick={() => setView('password')}
            style={outlineBtnStyle}
          >
            <span>🔒</span> Use password instead
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: 12, color: '#E11D48', textAlign: 'center' }}>{error}</p>}
    </>
  );

  const renderPassword = () => (
    <>
      <button
        onClick={() => { setView('main'); setError(''); }}
        style={{ fontSize: 12, color: '#B0B8C4', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4 }}
      >
        ← Back
      </button>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0D14' }}>Enter your password</h2>
      <form onSubmit={handlePassword} className="flex flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your account password"
          autoFocus
          style={inputStyle}
        />
        {error && <p style={{ fontSize: 12, color: '#E11D48' }}>{error}</p>}
        <button
          type="submit"
          disabled={!password || loading}
          style={{ ...primaryBtnStyle, opacity: !password || loading ? 0.5 : 1 }}
        >
          {loading ? 'Verifying…' : 'Verify & continue'}
        </button>
      </form>
    </>
  );

  const renderRegister = () => (
    <>
      <button
        onClick={() => { setView('main'); setError(''); }}
        style={{ fontSize: 12, color: '#B0B8C4', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 4 }}
      >
        ← Back
      </button>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0A0D14' }}>Set up biometric</h2>
        <p style={{ fontSize: 12, color: '#B0B8C4', marginTop: 4 }}>
          Register your fingerprint or Face ID to quickly verify sensitive actions in the future
        </p>
      </div>
      <form onSubmit={handleRegister} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label style={{ fontSize: 12, fontWeight: 500, color: '#B0B8C4' }}>Device name (optional)</label>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g. My Phone"
            style={inputStyle}
          />
        </div>
        {error && <p style={{ fontSize: 12, color: '#E11D48' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ ...primaryBtnStyle, opacity: loading ? 0.5 : 1 }}
        >
          <span className="text-xl">☝️</span>
          {loading ? 'Setting up…' : 'Register fingerprint / Face ID'}
        </button>
      </form>
    </>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      style={{ background: 'rgba(10,13,20,0.55)' }}
      onClick={onClose}
    >
      <div
        className="px-5 pt-5 pb-10 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        style={{ background: '#fff', borderRadius: '22px 22px 0 0' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mx-auto"
          style={{ width: 40, height: 4, borderRadius: 99, background: '#E9ECF0' }}
        />
        {view === 'main'     && renderMain()}
        {view === 'password' && renderPassword()}
        {view === 'register' && renderRegister()}
      </div>
    </div>
  );
}
