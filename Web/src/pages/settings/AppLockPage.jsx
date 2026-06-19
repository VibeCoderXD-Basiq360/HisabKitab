import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import Button from '../../components/ui/Button';
import { useLockStore } from '../../store/lockStore';
import { hashPin, checkPin } from '../../lib/pin';
import { isBiometricAvailable, registerBiometric } from '../../lib/webauthn';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

function PinDots({ length, filled }) {
  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all ${
            i < filled ? 'bg-primary-500 border-primary-500 scale-110' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

function PinPad({ pin, onChange }) {
  function press(key) {
    if (key === '⌫') { onChange(pin.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    onChange(pin + key);
  }
  return (
    <div className="flex flex-col items-center gap-5">
      <PinDots length={4} filled={pin.length} />
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

function ConfirmDisableStep({ lockType, pinHash, onConfirmed, onCancel }) {
  const { t } = useTranslation();
  const [pin, setPin]     = useState('');
  const [pwd, setPwd]     = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handlePinChange(v) {
    setPin(v);
    setError('');
    if (v.length === 4) {
      setChecking(true);
      const ok = await checkPin(v, pinHash);
      setChecking(false);
      if (ok) onConfirmed();
      else { setPin(''); setError(t('applock_settings.wrong_pin')); }
    }
  }

  async function handlePwdSubmit(e) {
    e.preventDefault();
    if (!pwd.trim()) return;
    setChecking(true);
    const ok = await checkPin(pwd, pinHash);
    setChecking(false);
    if (ok) onConfirmed();
    else { setPwd(''); setError(t('applock_settings.wrong_pwd')); }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 flex flex-col gap-5">
      <div className="text-center">
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {t('applock_settings.confirm_disable', { type: lockType === 'pin' ? 'PIN' : t('lock.type_password') })}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {t('applock_settings.confirm_disable_desc', { type: lockType === 'pin' ? 'PIN' : t('lock.type_password') })}
        </p>
      </div>

      {lockType === 'pin' ? (
        <PinPad pin={pin} onChange={handlePinChange} />
      ) : (
        <form onSubmit={handlePwdSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(''); }}
            placeholder="Enter current password"
            autoFocus
            className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
          />
          <button
            type="submit"
            disabled={!pwd.trim() || checking}
            className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm disabled:opacity-50"
          >
            {checking ? t('common.loading') : t('applock_settings.disable')}
          </button>
        </form>
      )}

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      {checking && lockType === 'pin' && <p className="text-xs text-gray-400 text-center">{t('common.loading')}</p>}

      <button onClick={onCancel} className="text-sm text-gray-400 text-center">{t('common.cancel')}</button>
    </div>
  );
}

export default function AppLockPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    enabled, lockType, pinHash, biometricEnabled,
    setEnabled, setLockType, setPinHash, setLocked, setBiometric, resetAttempts,
  } = useLockStore();

  const [step, setStep]         = useState('idle'); // idle | choose | set1 | set2 | confirm-disable
  const [chosenType, setChosenType] = useState('pin');
  const [pin1, setPin1]         = useState('');
  const [pin2, setPin2]         = useState('');
  const [pwd1, setPwd1]         = useState('');
  const [pwd2, setPwd2]         = useState('');
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  function startSetup() {
    setPin1(''); setPin2(''); setPwd1(''); setPwd2(''); setError('');
    setStep('choose');
  }

  function handleDisable() {
    setPin1(''); setPin2(''); setPwd1(''); setPwd2(''); setError('');
    setStep('confirm-disable');
  }

  async function handleDisableBiometric() {
    setBiometric(false, null);
  }

  async function handleEnableBiometric() {
    try {
      const credId = await registerBiometric();
      setBiometric(true, credId);
    } catch {
      alert('Biometric registration failed. Make sure your device supports fingerprint or Face ID.');
    }
  }

  // ── PIN flow ────────────────────────────────────────────────────────────
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
        setError(t('applock_settings.pins_no_match'));
        setPin2(''); setStep('set1'); setPin1('');
        return;
      }
      (async () => {
        setSaving(true);
        const h = await hashPin(pin1);
        setPinHash(h);
        setLockType('pin');
        setEnabled(true);
        setLocked(false);
        resetAttempts();
        setSaving(false);
        setStep('idle');
      })();
    }
  }

  // ── Password flow ───────────────────────────────────────────────────────
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (pwd1.length < 6) { setError(t('applock_settings.pwd_short')); return; }
    if (pwd1 !== pwd2) { setError(t('applock_settings.pwd_no_match')); return; }
    setSaving(true);
    const h = await hashPin(pwd1);
    setPinHash(h);
    setLockType('password');
    setEnabled(true);
    setLocked(false);
    resetAttempts();
    setSaving(false);
    setStep('idle');
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('applock_settings.title')} showBack />
      <div className="flex-1 pb-24 p-4 flex flex-col gap-4">

        {/* ── Idle: overview ─────────────────────────────────────────── */}
        {step === 'idle' && (
          <>
            {/* Status card */}
            <div className={`rounded-2xl p-5 flex flex-col items-center gap-3 text-center ${
              enabled
                ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                : 'bg-white dark:bg-gray-800'
            }`}>
              <div className="w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-3xl">
                {enabled ? '🔒' : '🔓'}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {enabled
                    ? `${t('applock_settings.on')} · ${lockType === 'pin' ? t('applock_settings.pin_label') : t('applock_settings.pwd_label')}`
                    : t('applock_settings.off')}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {enabled
                    ? t('applock_settings.on_desc')
                    : t('applock_settings.off_desc')}
                </p>
              </div>
            </div>

            {!enabled ? (
              <Button variant="primary" onClick={startSetup}>
                {t('applock_settings.setup')}
              </Button>
            ) : (
              <div className="flex flex-col gap-3">

                {/* ── Biometric section ─────────────────────────────── */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
                  <div className={`px-4 py-3 flex items-center justify-between ${bioAvailable ? '' : 'opacity-50'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">☝️</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                          {t('applock_settings.bio_title')}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {!bioAvailable
                            ? t('applock_settings.bio_not_supported')
                            : biometricEnabled
                            ? t('applock_settings.bio_active')
                            : t('applock_settings.bio_hint')}
                        </p>
                      </div>
                    </div>
                    {bioAvailable && (
                      <button
                        onClick={biometricEnabled ? handleDisableBiometric : handleEnableBiometric}
                        className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${
                          biometricEnabled ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    )}
                  </div>
                  {bioAvailable && biometricEnabled && (
                    <div className="px-4 pb-3">
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        ✓ {t('applock_settings.bio_registered', { type: lockType === 'pin' ? 'PIN' : t('lock.type_password') })}
                      </p>
                    </div>
                  )}
                  {bioAvailable && !biometricEnabled && (
                    <div className="px-4 pb-3">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {t('applock_settings.bio_optional', { type: lockType === 'pin' ? 'PIN' : t('lock.type_password') })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Change / disable */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                  <button
                    onClick={startSetup}
                    className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left active:bg-gray-50 dark:active:bg-gray-700"
                  >
                    <span className="text-xl">🔑</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {t('applock_settings.change_pin', {
                        type: lockType === 'pin' ? 'PIN' : t('lock.type_password'),
                        other: lockType === 'pin' ? t('lock.type_password') : 'PIN',
                      })}
                    </span>
                  </button>
                  <button
                    onClick={handleDisable}
                    className="w-full flex items-center gap-3 px-4 min-h-[52px] text-left active:bg-red-50 dark:active:bg-red-900/10"
                  >
                    <span className="text-xl">🗑️</span>
                    <span className="text-sm font-medium text-red-500">{t('applock_settings.disable')}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Step: choose type ───────────────────────────────────────── */}
        {step === 'choose' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{t('applock_settings.choose_type')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {t('applock_settings.choose_desc')}
              </p>
            </div>
            <div className="flex gap-3">
              {[
                { value: 'pin',      icon: '🔢', label: t('applock_settings.pin_label'),  desc: t('applock_settings.pin_desc') },
                { value: 'password', icon: '🔤', label: t('applock_settings.pwd_label'),  desc: t('applock_settings.pwd_desc') },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setChosenType(opt.value)}
                  className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-1 transition-colors ${
                    chosenType === opt.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{opt.label}</p>
                  <p className="text-[10px] text-gray-400 text-center">{opt.desc}</p>
                </button>
              ))}
            </div>
            <Button variant="primary" onClick={() => setStep('set1')}>
              {t('applock_settings.continue_with', {
                type: chosenType === 'pin' ? t('applock_settings.pin_label') : t('applock_settings.pwd_label'),
              })}
            </Button>
            <button onClick={() => setStep('idle')} className="text-sm text-gray-400 text-center">{t('common.cancel')}</button>
          </div>
        )}

        {/* ── Step: set PIN (first entry) ─────────────────────────────── */}
        {step === 'set1' && chosenType === 'pin' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 flex flex-col gap-6">
            <p className="text-sm font-bold text-gray-900 dark:text-white text-center">{t('applock_settings.enter_new_pin')}</p>
            <PinPad pin={pin1} onChange={handlePin1} />
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <button onClick={() => setStep('idle')} className="text-sm text-gray-400 text-center">{t('common.cancel')}</button>
          </div>
        )}

        {/* ── Step: confirm PIN ──────────────────────────────────────── */}
        {step === 'set2' && chosenType === 'pin' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 flex flex-col gap-6">
            <p className="text-sm font-bold text-gray-900 dark:text-white text-center">{t('applock_settings.confirm_pin')}</p>
            <PinPad pin={pin2} onChange={handlePin2} />
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            {saving && <p className="text-xs text-gray-400 text-center">{t('common.saving')}</p>}
            <button onClick={() => { setStep('choose'); setPin1(''); setPin2(''); }} className="text-sm text-gray-400 text-center">{t('common.back')}</button>
          </div>
        )}

        {/* ── Step: confirm identity before disable ──────────────────── */}
        {step === 'confirm-disable' && (
          <ConfirmDisableStep
            lockType={lockType}
            pinHash={pinHash}
            onConfirmed={() => {
              setEnabled(false);
              setPinHash(null);
              setBiometric(false, null);
              setLocked(false);
              resetAttempts();
              navigate('/settings');
            }}
            onCancel={() => setStep('idle')}
          />
        )}

        {/* ── Step: set password ────────────────────────────────────── */}
        {step === 'set1' && chosenType === 'password' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5">
            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{t('applock_settings.set_password')}</p>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('applock_settings.pwd_min')}</label>
                <input
                  type="password"
                  value={pwd1}
                  onChange={(e) => { setPwd1(e.target.value); setError(''); }}
                  placeholder="Enter password"
                  autoFocus
                  className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('applock_settings.pwd_confirm')}</label>
                <input
                  type="password"
                  value={pwd2}
                  onChange={(e) => { setPwd2(e.target.value); setError(''); }}
                  placeholder="Confirm password"
                  className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              {saving && <p className="text-xs text-gray-400">{t('common.saving')}</p>}
              <button
                type="submit"
                disabled={!pwd1 || !pwd2 || saving}
                className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-50"
              >
                {saving ? t('common.saving') : t('applock_settings.set_password')}
              </button>
              <button type="button" onClick={() => setStep('choose')} className="text-sm text-gray-400 text-center">{t('common.back')}</button>
            </form>
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
}
