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

  const renderMain = () => (
    <>
      <div className="text-center">
        <div className="text-5xl mb-3">🔐</div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {title || 'Verify your identity'}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
          {description || 'This sensitive action requires identity verification'}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {/* Biometric / fingerprint */}
        {biometricSupported && hasBiometric && (
          <button
            onClick={handleBiometric}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-primary-500 text-white font-semibold text-sm flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl">☝️</span>
            {loading ? 'Authenticating…' : 'Use fingerprint / Face ID'}
          </button>
        )}

        {/* Register biometric CTA */}
        {canRegister && (
          <button
            onClick={() => setView('register')}
            className="w-full py-3.5 rounded-2xl border-2 border-dashed border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 font-medium text-sm flex items-center justify-center gap-2"
          >
            <span className="text-xl">☝️</span>
            Set up fingerprint / Face ID
          </button>
        )}

        {/* Divider */}
        {biometricSupported && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
          </div>
        )}

        {/* Password / Google */}
        {isGoogle ? (
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center gap-3 text-sm font-semibold text-gray-800 dark:text-gray-200 disabled:opacity-50"
          >
            <span className="text-xl font-bold text-blue-500">G</span>
            {loading ? 'Verifying…' : 'Verify with Google'}
          </button>
        ) : (
          <button
            onClick={() => setView('password')}
            className="w-full py-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2"
          >
            <span>🔒</span> Use password instead
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </>
  );

  const renderPassword = () => (
    <>
      <button onClick={() => { setView('main'); setError(''); }} className="text-xs text-gray-400 flex items-center gap-1 mb-1">
        ← Back
      </button>
      <h2 className="text-base font-bold text-gray-900 dark:text-white">Enter your password</h2>
      <form onSubmit={handlePassword} className="flex flex-col gap-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your account password"
          autoFocus
          className="min-h-[48px] px-4 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={!password || loading}
          className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Verify & continue'}
        </button>
      </form>
    </>
  );

  const renderRegister = () => (
    <>
      <button onClick={() => { setView('main'); setError(''); }} className="text-xs text-gray-400 flex items-center gap-1 mb-1">
        ← Back
      </button>
      <div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Set up biometric</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Register your fingerprint or Face ID to quickly verify sensitive actions in the future
        </p>
      </div>
      <form onSubmit={handleRegister} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Device name (optional)</label>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g. My Phone"
            className="min-h-[44px] px-4 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="text-xl">☝️</span>
          {loading ? 'Setting up…' : 'Register fingerprint / Face ID'}
        </button>
      </form>
    </>
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-10 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto" />
        {view === 'main'     && renderMain()}
        {view === 'password' && renderPassword()}
        {view === 'register' && renderRegister()}
      </div>
    </div>
  );
}
