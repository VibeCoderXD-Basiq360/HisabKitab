import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import Button from '../../components/ui/Button';
import { useLockStore } from '../../store/lockStore';
import { hashPin } from '../../lib/pin';
import { isBiometricAvailable, registerBiometric } from '../../lib/webauthn';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

function PinPad({ pin, onChange, label, error }) {
  function press(key) {
    if (key === '⌫') { onChange(pin.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    onChange(pin + key);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < pin.length
                ? 'bg-primary-500 border-primary-500 scale-110'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="grid grid-cols-3 gap-3 w-56">
        {KEYS.map((key, idx) =>
          key === '' ? <div key={idx} /> : (
            <button
              key={idx}
              type="button"
              onClick={() => press(key)}
              className={`h-14 rounded-2xl font-semibold text-lg flex items-center justify-center active:scale-95 transition-all ${
                key === '⌫'
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {key}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export default function AppLockPage() {
  const navigate = useNavigate();
  const { enabled, biometricEnabled, setEnabled, setPinHash, setLocked, setBiometric } = useLockStore();

  const [step, setStep] = useState('idle'); // idle | set1 | set2
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  function handleDisable() {
    if (!window.confirm('Disable app lock? The PIN will be cleared.')) return;
    setEnabled(false);
    setPinHash(null);
    setBiometric(false, null);
    setLocked(false);
    navigate('/settings');
  }

  async function handleDisableBiometric() {
    setBiometric(false, null);
  }

  async function handleEnableBiometric() {
    try {
      const credId = await registerBiometric();
      setBiometric(true, credId);
    } catch (e) {
      alert('Biometric registration failed. Make sure your device supports it.');
    }
  }

  // Auto-advance from pin1 to pin2 when 4 digits entered
  function handlePin1(v) {
    setPin1(v);
    setError('');
    if (v.length === 4) setStep('set2');
  }

  function handlePin2(v) {
    setPin2(v);
    setError('');
    if (v.length === 4) {
      if (pin1 !== v) {
        setError('PINs do not match. Try again.');
        setPin2('');
        setStep('set1');
        setPin1('');
      } else {
        (async () => {
          setSaving(true);
          const h = await hashPin(pin1);
          setPinHash(h);
          setEnabled(true);
          setLocked(false);
          setSaving(false);
          navigate('/settings');
        })();
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="App Lock" showBack />
      <div className="flex-1 pb-24 p-4 flex flex-col gap-4">

        {step === 'idle' && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-3xl">
                🔒
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {enabled ? 'App Lock is ON' : 'App Lock is OFF'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {enabled
                    ? 'App will lock when sent to background.'
                    : 'Set a 4-digit PIN to lock the app when backgrounded.'}
                </p>
              </div>
            </div>

            {!enabled ? (
              <Button variant="primary" onClick={() => setStep('set1')}>
                Set PIN
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Biometric section */}
                {bioAvailable && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">👆</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Biometric Unlock</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {biometricEnabled ? 'TouchID / FaceID / Windows Hello' : 'Use fingerprint or face to unlock'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={biometricEnabled ? handleDisableBiometric : handleEnableBiometric}
                      className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${biometricEnabled ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${biometricEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                )}

                <Button variant="outline" onClick={() => { setPin1(''); setPin2(''); setStep('set1'); }}>
                  Change PIN
                </Button>
                <button onClick={handleDisable} className="text-sm text-red-500 text-center py-2">
                  Disable App Lock
                </button>
              </div>
            )}
          </>
        )}

        {step === 'set1' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <PinPad pin={pin1} onChange={handlePin1} label="Enter a new 4-digit PIN" error="" />
          </div>
        )}

        {step === 'set2' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
            <PinPad pin={pin2} onChange={handlePin2} label="Confirm PIN" error={error} />
            {saving && <p className="text-xs text-gray-400 text-center mt-3">Saving…</p>}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
