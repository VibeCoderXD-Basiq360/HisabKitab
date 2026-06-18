import { useState, useEffect } from 'react';
import { useLockStore } from '../store/lockStore';
import { checkPin } from '../lib/pin';
import { verifyBiometric } from '../lib/webauthn';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function LockScreen() {
  const { locked, pinHash, setLocked, setEnabled, setPinHash, biometricEnabled, biometricCredId, setBiometric } = useLockStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [bioLoading, setBioLoading] = useState(false);

  // Auto-trigger biometric when lock screen appears
  useEffect(() => {
    if (locked && biometricEnabled && biometricCredId) {
      handleBiometric();
    }
  }, [locked]);

  // Keyboard support
  useEffect(() => {
    if (!locked) return;
    function handler(e) {
      if (e.key >= '0' && e.key <= '9') press(e.key);
      if (e.key === 'Backspace') press('⌫');
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [locked, pin]);

  useEffect(() => {
    if (pin.length === 4) verify();
  }, [pin]);

  function press(key) {
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      setError('');
      return;
    }
    if (pin.length >= 4) return;
    setPin((p) => p + key);
  }

  async function verify() {
    const ok = await checkPin(pin, pinHash);
    if (ok) {
      setLocked(false);
      setPin('');
      setError('');
      setAttempts(0);
    } else {
      setPin('');
      setError('Incorrect PIN');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setAttempts((a) => a + 1);
    }
  }

  async function handleBiometric() {
    if (!biometricCredId) return;
    setBioLoading(true);
    try {
      await verifyBiometric(biometricCredId);
      setLocked(false);
      setPin('');
      setError('');
    } catch {
      setError('Biometric failed — enter PIN instead');
    } finally {
      setBioLoading(false);
    }
  }

  function handleForgot() {
    if (!window.confirm('This will disable app lock. You can re-enable it in Settings. Continue?')) return;
    setEnabled(false);
    setPinHash(null);
    setBiometric(false, null);
    setLocked(false);
    setPin('');
    setAttempts(0);
  }

  if (!locked) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-900 select-none">
      {/* App name */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center text-white text-3xl mb-3 shadow-lg">
          💰
        </div>
        <p className="text-white text-lg font-semibold">HisabKitab</p>
        <p className="text-gray-400 text-sm mt-1">Enter PIN to unlock</p>
      </div>

      {/* PIN dots */}
      <div className={`flex gap-4 mb-8 transition-transform ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
              i < pin.length
                ? 'bg-primary-400 border-primary-400 scale-110'
                : 'bg-transparent border-gray-500'
            }`}
          />
        ))}
      </div>

      {/* Error */}
      <p className={`text-sm text-red-400 mb-6 h-5 transition-opacity ${error ? 'opacity-100' : 'opacity-0'}`}>
        {error}
      </p>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {KEYS.map((key, idx) => (
          key === '' ? (
            <div key={idx} />
          ) : (
            <button
              key={idx}
              onClick={() => press(key)}
              className={`h-16 rounded-2xl text-white font-semibold text-xl flex items-center justify-center transition-all active:scale-95 ${
                key === '⌫'
                  ? 'bg-gray-700 text-gray-300 text-base'
                  : 'bg-gray-800 hover:bg-gray-700 active:bg-gray-600'
              }`}
            >
              {key}
            </button>
          )
        ))}
      </div>

      {/* Biometric button */}
      {biometricEnabled && biometricCredId && (
        <button
          onClick={handleBiometric}
          disabled={bioLoading}
          className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gray-800 text-gray-300 text-sm font-medium active:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <span className="text-xl">{bioLoading ? '⏳' : '👆'}</span>
          {bioLoading ? 'Waiting…' : 'Use Biometrics'}
        </button>
      )}

      {/* Forgot PIN */}
      {attempts >= 5 && (
        <button
          onClick={handleForgot}
          className="mt-6 text-sm text-gray-500 underline"
        >
          Forgot PIN? Disable lock
        </button>
      )}
    </div>
  );
}
