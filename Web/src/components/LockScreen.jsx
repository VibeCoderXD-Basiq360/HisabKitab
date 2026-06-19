import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLockStore } from '../store/lockStore';
import { checkPin, hashPin } from '../lib/pin';
import { verifyBiometric } from '../lib/webauthn';
import { usePinResetRequest, usePinResetVerify } from '../hooks/usePinReset';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

function PinDots({ length, filled }) {
  return (
    <div className="flex gap-4">
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
            i < filled ? 'bg-primary-400 border-primary-400 scale-110' : 'bg-transparent border-gray-500'
          }`}
        />
      ))}
    </div>
  );
}

function PinPadGrid({ pin, onChange, disabled }) {
  function press(key) {
    if (disabled) return;
    if (key === '⌫') { onChange(pin.slice(0, -1)); return; }
    if (pin.length >= 4) return;
    onChange(pin + key);
  }
  return (
    <div className="flex flex-col items-center gap-5">
      <PinDots length={4} filled={pin.length} />
      <div className="grid grid-cols-3 gap-3 w-64">
        {KEYS.map((key, idx) =>
          key === '' ? <div key={idx} /> : (
            <button
              key={idx}
              type="button"
              onClick={() => press(key)}
              disabled={disabled}
              className={`h-16 rounded-2xl font-semibold text-xl flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 ${
                key === '⌫'
                  ? 'bg-gray-800 text-gray-300 text-base'
                  : 'bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-600'
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

// ─── OTP digit display ────────────────────────────────────────────────────────
function OtpDisplay({ value }) {
  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`w-10 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition-all ${
            i < value.length
              ? 'border-primary-400 bg-gray-800 text-white'
              : i === value.length
              ? 'border-primary-500 bg-gray-900 text-white animate-pulse'
              : 'border-gray-700 bg-gray-800/50 text-transparent'
          }`}
        >
          {value[i] || ''}
        </div>
      ))}
    </div>
  );
}

export default function LockScreen() {
  const { t } = useTranslation();
  const {
    locked, pinHash, lockType,
    setLocked, setEnabled, setPinHash, setLockType,
    biometricEnabled, biometricCredId, setBiometric,
    failedAttempts, lockedUntil,
    incFailedAttempts, resetAttempts,
  } = useLockStore();

  // ── Main lock state ───────────────────────────────────────────────────────
  const [view, setView]         = useState('lock'); // lock | forgot | otp | choose-new | new-pin-1 | new-pin-2 | new-password
  const [pin, setPin]           = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [shake, setShake]       = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [countdown, setCountdown]   = useState(0);
  const passwordRef = useRef(null);
  const bioTriggered = useRef(false);

  // ── Forgot / OTP state ────────────────────────────────────────────────────
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp]               = useState('');
  const [otpError, setOtpError]     = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  // ── New credential state (after OTP verified) ─────────────────────────────
  const [newPin1, setNewPin1]     = useState('');
  const [newPin2, setNewPin2]     = useState('');
  const [newPwd1, setNewPwd1]     = useState('');
  const [newPwd2, setNewPwd2]     = useState('');
  const [newPwdError, setNewPwdError] = useState('');
  const [saving, setSaving]       = useState(false);
  const [disableConfirm, setDisableConfirm] = useState(false);

  const pinResetRequest = usePinResetRequest();
  const pinResetVerify  = usePinResetVerify();

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!lockedUntil) { setCountdown(0); return; }
    const tick = () => setCountdown(Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const isCooldown = countdown > 0;

  // ── Biometric auto-trigger ────────────────────────────────────────────────
  const handleBiometric = useCallback(async () => {
    if (!biometricCredId || bioLoading) return;
    setBioLoading(true);
    setError('');
    try {
      await verifyBiometric(biometricCredId);
      setLocked(false);
      setPin(''); setPassword(''); setError('');
      resetAttempts();
    } catch {
      setError('Biometric failed — use your ' + (lockType === 'pin' ? 'PIN' : 'password') + ' below');
      if (lockType === 'password') setTimeout(() => passwordRef.current?.focus(), 100);
    } finally {
      setBioLoading(false);
    }
  }, [biometricCredId, bioLoading, lockType, resetAttempts, setLocked]);

  useEffect(() => {
    if (locked && biometricEnabled && biometricCredId && !bioTriggered.current) {
      bioTriggered.current = true;
      setTimeout(() => handleBiometric(), 300);
    }
    if (!locked) {
      bioTriggered.current = false;
      setView('lock');
      setOtp(''); setOtpError(''); setOtpVerified(false);
      setNewPin1(''); setNewPin2(''); setNewPwd1(''); setNewPwd2('');
      setDisableConfirm(false);
    }
  }, [locked, biometricEnabled, biometricCredId, handleBiometric]);

  useEffect(() => {
    if (locked && lockType === 'password' && !biometricEnabled && view === 'lock') {
      setTimeout(() => passwordRef.current?.focus(), 400);
    }
  }, [locked, lockType, biometricEnabled, view]);

  // ── Keyboard: PIN mode ────────────────────────────────────────────────────
  useEffect(() => {
    if (!locked || lockType !== 'pin' || view !== 'lock') return;
    const handler = (e) => {
      if (isCooldown) return;
      if (e.key >= '0' && e.key <= '9') pressKey(e.key);
      if (e.key === 'Backspace') pressKey('⌫');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [locked, lockType, view, pin, isCooldown]);

  // ── Auto-verify PIN at 4 chars ────────────────────────────────────────────
  useEffect(() => {
    if (view === 'lock' && pin.length === 4) verifyPin();
  }, [pin, view]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  function pressKey(key) {
    if (isCooldown) return;
    if (key === '⌫') { setPin(p => p.slice(0, -1)); setError(''); return; }
    if (pin.length >= 4) return;
    setPin(p => p + key);
  }

  function fmtCountdown(s) {
    return s >= 60 ? `${Math.ceil(s / 60)}m ${s % 60}s` : `${s}s`;
  }

  // ── Verify main PIN ───────────────────────────────────────────────────────
  async function verifyPin() {
    if (isCooldown) return;
    const ok = await checkPin(pin, pinHash);
    if (ok) {
      setLocked(false); setPin(''); setError(''); resetAttempts();
    } else {
      setPin('');
      incFailedAttempts();
      const next = failedAttempts + 1;
      const msg = next >= 10 ? t('lock.too_many_wait', { time: '30m' })
                : next >= 7  ? t('lock.wrong_pin_left', { n: 10 - next })
                : next >= 5  ? t('lock.wrong_pin_cooldown', { time: '1m' })
                : next >= 3  ? t('lock.wrong_pin_cooldown', { time: '30s' })
                : t('lock.wrong_pin');
      setError(msg);
      triggerShake();
    }
  }

  // ── Verify main password ──────────────────────────────────────────────────
  async function verifyPassword() {
    if (isCooldown || !password.trim()) return;
    const ok = await checkPin(password, pinHash);
    if (ok) {
      setLocked(false); setPassword(''); setError(''); resetAttempts();
    } else {
      setPassword('');
      incFailedAttempts();
      const next = failedAttempts + 1;
      const msg = next >= 5 ? t('lock.too_many_password') : t('lock.wrong_password', { n: next });
      setError(msg);
      triggerShake();
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  }

  // ── OTP: request ──────────────────────────────────────────────────────────
  async function handleRequestOTP() {
    setOtpError('');
    try {
      const { maskedEmail: me } = await pinResetRequest.mutateAsync();
      setMaskedEmail(me);
      setView('otp');
    } catch (err) {
      setOtpError(err?.response?.data?.error || 'Failed to send code — check your connection');
    }
  }

  // ── OTP: verify (called auto when 6 digits) ───────────────────────────────
  async function handleVerifyOTP(code) {
    setOtpError('');
    try {
      await pinResetVerify.mutateAsync(code);
      setOtpVerified(true);
      setView('choose-new');
    } catch (err) {
      setOtp('');
      setOtpError(err?.response?.data?.error || 'Wrong code — try again');
    }
  }

  function handleOtpChange(val) {
    const digits = val.replace(/\D/g, '').slice(0, 6);
    setOtp(digits);
    setOtpError('');
    if (digits.length === 6) handleVerifyOTP(digits);
  }

  // ── New PIN flow ──────────────────────────────────────────────────────────
  function handleNewPin1(v) {
    setNewPin1(v);
    setNewPwdError('');
    if (v.length === 4) setView('new-pin-2');
  }

  function handleNewPin2(v) {
    setNewPin2(v);
    setNewPwdError('');
    if (v.length === 4) {
      if (newPin1 !== v) {
        setNewPwdError('PINs do not match — try again');
        setNewPin1(''); setNewPin2('');
        setView('new-pin-1');
        return;
      }
      (async () => {
        setSaving(true);
        const h = await hashPin(newPin1);
        setPinHash(h);
        setLockType('pin');
        resetAttempts();
        setSaving(false);
        setLocked(false);
      })();
    }
  }

  // ── New password flow ─────────────────────────────────────────────────────
  async function handleNewPasswordSubmit(e) {
    e.preventDefault();
    if (newPwd1.length < 6) { setNewPwdError('Password must be at least 6 characters'); return; }
    if (newPwd1 !== newPwd2) { setNewPwdError('Passwords do not match — try again'); return; }
    setSaving(true);
    const h = await hashPin(newPwd1);
    setPinHash(h);
    setLockType('password');
    resetAttempts();
    setSaving(false);
    setLocked(false);
  }

  // ── Disable lock (identity-gated) ─────────────────────────────────────────
  function handleDisableLock() {
    setEnabled(false);
    setPinHash(null);
    setBiometric(false, null);
    resetAttempts();
    setLocked(false);
  }

  if (!locked) return null;

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: lock (default)
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'lock') {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950 select-none overflow-hidden">

        {/* App identity */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center text-3xl mb-3 shadow-lg shadow-primary-900/40">
            💰
          </div>
          <p className="text-white text-lg font-bold tracking-tight">HisabKitab</p>
          <p className="text-gray-400 text-xs mt-0.5">
            {biometricEnabled
              ? t('lock.subtitle_bio', { type: lockType === 'pin' ? t('lock.type_pin') : t('lock.type_password') })
              : t('lock.subtitle_pin', { type: lockType === 'pin' ? t('lock.type_pin') : t('lock.type_password') })}
          </p>
        </div>

        {/* Biometric button */}
        {biometricEnabled && biometricCredId && (
          <button
            onClick={handleBiometric}
            disabled={bioLoading || isCooldown}
            className="mb-6 flex flex-col items-center gap-2 px-8 py-4 rounded-3xl bg-gray-800 border border-gray-700 active:bg-gray-700 disabled:opacity-40 transition-all active:scale-95"
          >
            <span className="text-5xl">{bioLoading ? '⏳' : '☝️'}</span>
            <span className="text-white text-sm font-semibold">
              {bioLoading ? t('lock.bio_waiting') : t('lock.touch_id')}
            </span>
            <span className="text-gray-400 text-xs">{t('lock.bio_hint')}</span>
          </button>
        )}

        {/* Cooldown */}
        {isCooldown && (
          <div className="mb-4 px-5 py-2.5 rounded-xl bg-red-900/30 border border-red-800">
            <p className="text-red-400 text-sm font-medium text-center">
              {t('lock.too_many_wait', { time: fmtCountdown(countdown) })}
            </p>
          </div>
        )}

        {/* Error */}
        <p className={`text-sm text-red-400 mb-4 h-5 transition-opacity text-center px-6 ${error ? 'opacity-100' : 'opacity-0'}`}>
          {error}
        </p>

        {/* PIN pad */}
        {lockType === 'pin' && (
          <div className={`transition-transform ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
            <PinPadGrid pin={pin} onChange={(v) => { if (!isCooldown) { setPin(v); setError(''); } }} disabled={isCooldown} />
          </div>
        )}

        {/* Password input */}
        {lockType === 'password' && (
          <div className={`w-72 flex flex-col gap-3 transition-transform ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
            <input
              ref={passwordRef}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') verifyPassword(); }}
              placeholder="Enter password"
              disabled={isCooldown}
              className="w-full min-h-[52px] px-5 rounded-2xl bg-gray-800 border border-gray-700 text-white text-base text-center tracking-widest placeholder:tracking-normal placeholder:text-gray-500 outline-none focus:border-primary-500 disabled:opacity-30"
            />
            <button
              onClick={verifyPassword}
              disabled={!password.trim() || isCooldown}
              className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-bold text-base disabled:opacity-30 active:scale-95 transition-all"
            >
              {t('lock.unlock')}
            </button>
          </div>
        )}

        {/* Biometric retry after failure */}
        {biometricEnabled && biometricCredId && !bioLoading && error.includes('iometric') && (
          <button onClick={handleBiometric} disabled={isCooldown} className="mt-5 text-sm text-primary-400 font-medium disabled:opacity-30">
            {t('lock.try_bio_again')}
          </button>
        )}

        {/* Forgot PIN / Change PIN */}
        <button
          onClick={() => { setError(''); setOtpError(''); setOtp(''); setView('forgot'); }}
          className="mt-8 text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          {t('lock.forgot', { type: lockType === 'pin' ? t('lock.type_pin') : t('lock.type_password') })}
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: forgot — send OTP
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'forgot') {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950 select-none px-8">
        <div className="w-full max-w-sm flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl">
            📧
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base">{t('lock.reset_title')}</p>
            <p className="text-gray-400 text-sm mt-1">
              {t('lock.reset_desc')}
            </p>
          </div>

          {otpError && (
            <p className="text-red-400 text-sm text-center">{otpError}</p>
          )}

          <button
            onClick={handleRequestOTP}
            disabled={pinResetRequest.isPending}
            className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-all"
          >
            {pinResetRequest.isPending ? t('lock.sending') : t('lock.send_code')}
          </button>
          <button
            onClick={() => { setView('lock'); setOtpError(''); }}
            className="text-sm text-gray-500 hover:text-gray-400"
          >
            {t('lock.back_to_lock')}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: otp — enter 6-digit code
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'otp') {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950 select-none px-8">
        <div className="w-full max-w-sm flex flex-col items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl">
            🔢
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base">{t('lock.enter_code')}</p>
            <p className="text-gray-400 text-sm mt-1">
              {t('lock.code_sent_to')} <span className="text-gray-300 font-medium">{maskedEmail}</span>
            </p>
          </div>

          <OtpDisplay value={otp} />

          {/* Hidden input for native keyboard */}
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={otp}
            onChange={(e) => handleOtpChange(e.target.value)}
            autoFocus
            className="opacity-0 absolute w-0 h-0"
            aria-label="Enter 6-digit code"
          />

          {/* Tap digits on OtpDisplay to focus hidden input */}
          <button
            onClick={() => document.querySelector('input[type="tel"]')?.focus()}
            className="text-xs text-primary-400"
          >
            {t('lock.tap_enter')}
          </button>

          {otpError && (
            <p className="text-red-400 text-sm text-center">{otpError}</p>
          )}
          {(pinResetVerify.isPending) && (
            <p className="text-gray-400 text-sm">{t('lock.verifying')}</p>
          )}

          <div className="flex gap-4 w-full">
            <button
              onClick={() => { setView('forgot'); setOtp(''); setOtpError(''); }}
              className="flex-1 py-3 rounded-2xl border border-gray-700 text-gray-400 text-sm font-medium active:scale-95"
            >
              {t('lock.resend_code')}
            </button>
            <button
              onClick={() => { setView('lock'); setOtp(''); setOtpError(''); }}
              className="flex-1 py-3 rounded-2xl border border-gray-700 text-gray-400 text-sm font-medium active:scale-95"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: choose-new — after OTP verified: set new PIN, new password, or disable
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'choose-new') {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950 select-none px-8">
        <div className="w-full max-w-sm flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-green-600 flex items-center justify-center text-3xl">
            ✅
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-base">{t('lock.identity_verified')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('lock.what_to_do')}</p>
          </div>

          <div className="w-full flex flex-col gap-2 mt-2">
            <button
              onClick={() => { setNewPin1(''); setNewPin2(''); setNewPwdError(''); setView('new-pin-1'); }}
              className="w-full py-4 rounded-2xl bg-gray-800 border border-gray-700 text-white text-sm font-semibold text-left px-5 flex items-center gap-3 active:scale-95 transition-all"
            >
              <span className="text-2xl">🔢</span>
              <div>
                <p>{t('lock.new_pin_option')}</p>
                <p className="text-xs text-gray-400 font-normal mt-0.5">{t('lock.new_pin_desc')}</p>
              </div>
            </button>
            <button
              onClick={() => { setNewPwd1(''); setNewPwd2(''); setNewPwdError(''); setView('new-password'); }}
              className="w-full py-4 rounded-2xl bg-gray-800 border border-gray-700 text-white text-sm font-semibold text-left px-5 flex items-center gap-3 active:scale-95 transition-all"
            >
              <span className="text-2xl">🔤</span>
              <div>
                <p>{t('lock.new_pwd_option')}</p>
                <p className="text-xs text-gray-400 font-normal mt-0.5">{t('lock.new_pwd_desc')}</p>
              </div>
            </button>

            {!disableConfirm ? (
              <button
                onClick={() => setDisableConfirm(true)}
                className="w-full py-4 rounded-2xl bg-red-900/20 border border-red-800/50 text-red-400 text-sm font-semibold text-left px-5 flex items-center gap-3 active:scale-95 transition-all"
              >
                <span className="text-2xl">🗑️</span>
                <div>
                  <p>{t('lock.disable_option')}</p>
                  <p className="text-xs text-red-500/70 font-normal mt-0.5">{t('lock.disable_desc')}</p>
                </div>
              </button>
            ) : (
              <div className="w-full p-4 rounded-2xl bg-red-900/20 border border-red-700 flex flex-col gap-3">
                <p className="text-red-300 text-sm font-medium text-center">
                  {t('lock.disable_confirm')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDisableLock}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold active:scale-95"
                  >
                    {t('lock.yes_disable')}
                  </button>
                  <button
                    onClick={() => setDisableConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-700 text-gray-300 text-sm font-medium active:scale-95"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => { setView('lock'); setDisableConfirm(false); }}
            className="text-sm text-gray-500 hover:text-gray-400 mt-1"
          >
            {t('lock.back_to_lock')}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: new-pin-1 — enter new PIN
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'new-pin-1') {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950 select-none">
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="text-center px-8">
            <p className="text-white font-bold text-base">{t('lock.set_pin_title')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('lock.enter_new_pin')}</p>
          </div>
          {newPwdError && <p className="text-red-400 text-sm text-center px-8">{newPwdError}</p>}
          <PinPadGrid pin={newPin1} onChange={handleNewPin1} disabled={false} />
          <button onClick={() => setView('choose-new')} className="text-sm text-gray-500">{t('common.cancel')}</button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: new-pin-2 — confirm new PIN
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'new-pin-2') {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950 select-none">
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="text-center px-8">
            <p className="text-white font-bold text-base">{t('lock.confirm_pin_title')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('lock.confirm_pin_desc')}</p>
          </div>
          {newPwdError && <p className="text-red-400 text-sm text-center px-8">{newPwdError}</p>}
          {saving && <p className="text-gray-400 text-sm">{t('common.saving')}</p>}
          <PinPadGrid pin={newPin2} onChange={handleNewPin2} disabled={saving} />
          <button onClick={() => { setView('new-pin-1'); setNewPin1(''); setNewPin2(''); }} className="text-sm text-gray-500">
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VIEW: new-password — set new password
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'new-password') {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-950 select-none px-8">
        <div className="w-full max-w-sm">
          <p className="text-white font-bold text-base text-center mb-1">{t('lock.set_pwd_title')}</p>
          <p className="text-gray-400 text-sm text-center mb-5">{t('lock.min_6')}</p>
          <form onSubmit={handleNewPasswordSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              value={newPwd1}
              onChange={(e) => { setNewPwd1(e.target.value); setNewPwdError(''); }}
              placeholder={t('lock.new_pwd_placeholder')}
              autoFocus
              className="w-full min-h-[52px] px-5 rounded-2xl bg-gray-800 border border-gray-700 text-white text-base placeholder:text-gray-500 outline-none focus:border-primary-500"
            />
            <input
              type="password"
              value={newPwd2}
              onChange={(e) => { setNewPwd2(e.target.value); setNewPwdError(''); }}
              placeholder={t('lock.confirm_pwd_placeholder')}
              className="w-full min-h-[52px] px-5 rounded-2xl bg-gray-800 border border-gray-700 text-white text-base placeholder:text-gray-500 outline-none focus:border-primary-500"
            />
            {newPwdError && <p className="text-red-400 text-sm text-center">{newPwdError}</p>}
            {saving && <p className="text-gray-400 text-sm text-center">{t('common.saving')}</p>}
            <button
              type="submit"
              disabled={!newPwd1 || !newPwd2 || saving}
              className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all mt-1"
            >
              {saving ? t('common.saving') : t('lock.set_unlock')}
            </button>
            <button type="button" onClick={() => setView('choose-new')} className="text-sm text-gray-500 text-center">
              {t('common.back')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
}
