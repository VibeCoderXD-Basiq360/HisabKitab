import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Toggle from '../../components/ui/Toggle';
import { useLockStore } from '../../store/lockStore';
import { hashPin, checkPin } from '../../lib/pin';
import { isBiometricAvailable, registerBiometric } from '../../lib/webauthn';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

function PinDots({ length, filled }) {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
      {Array.from({ length }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: i < filled ? '#00C2B2' : '#E9ECF0',
            transition: 'background 0.15s, transform 0.15s',
            transform: i < filled ? 'scale(1.15)' : 'scale(1)',
          }}
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <PinDots length={4} filled={pin.length} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, width: 224 }}>
        {KEYS.map((key, idx) =>
          key === '' ? <div key={idx} /> : (
            <button
              key={idx}
              type="button"
              onClick={() => press(key)}
              style={{
                height: 56,
                background: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: key === '⌫' ? 16 : 20,
                fontWeight: 600,
                color: key === '⌫' ? '#6B7280' : '#0A0D14',
                cursor: 'pointer',
                boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.1s',
                WebkitTapHighlightColor: 'transparent',
              }}
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
    <SurfaceCard style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>
          {t('applock_settings.confirm_disable', { type: lockType === 'pin' ? 'PIN' : t('lock.type_password') })}
        </p>
        <p style={{ fontSize: 12, color: '#B0B8C4', marginTop: 4, marginBottom: 0 }}>
          {t('applock_settings.confirm_disable_desc', { type: lockType === 'pin' ? 'PIN' : t('lock.type_password') })}
        </p>
      </div>

      {lockType === 'pin' ? (
        <PinPad pin={pin} onChange={handlePinChange} />
      ) : (
        <form onSubmit={handlePwdSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(''); }}
            placeholder="Enter current password"
            autoFocus
            style={{
              minHeight: 48,
              padding: '0 16px',
              borderRadius: 10,
              border: 'none',
              background: '#F0F2F7',
              fontSize: 15,
              fontWeight: 600,
              color: '#0A0D14',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={!pwd.trim() || checking}
            style={{
              width: '100%',
              padding: '12px 0',
              borderRadius: 12,
              background: '#E11D48',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: !pwd.trim() || checking ? 'not-allowed' : 'pointer',
              opacity: !pwd.trim() || checking ? 0.5 : 1,
            }}
          >
            {checking ? t('common.loading') : t('applock_settings.disable')}
          </button>
        </form>
      )}

      {error && <p style={{ fontSize: 12, color: '#E11D48', textAlign: 'center', margin: 0 }}>{error}</p>}
      {checking && lockType === 'pin' && (
        <p style={{ fontSize: 12, color: '#B0B8C4', textAlign: 'center', margin: 0 }}>{t('common.loading')}</p>
      )}

      <button
        onClick={onCancel}
        style={{ background: 'none', border: 'none', fontSize: 14, color: '#B0B8C4', textAlign: 'center', cursor: 'pointer', padding: '4px 0' }}
      >
        {t('common.cancel')}
      </button>
    </SurfaceCard>
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

  // ── PIN flow ──────────────────────────────────────────────────────
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

  // ── Password flow ─────────────────────────────────────────────────
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('applock_settings.title')} showBack />
      <div style={{
        flex: 1,
        padding: '16px 16px',
        paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>

        {/* ── Idle: overview ─────────────────────────────────────── */}
        {step === 'idle' && (
          <>
            {/* Status card */}
            <SurfaceCard style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              textAlign: 'center',
              background: enabled ? 'rgba(0,194,178,0.06)' : '#fff',
              border: enabled ? '1px solid rgba(0,194,178,0.25)' : 'none',
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: enabled ? 'rgba(0,194,178,0.12)' : '#F0F2F7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
                color: '#00C2B2',
              }}>
                {enabled ? '🔒' : '🔓'}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>
                  {enabled
                    ? `${t('applock_settings.on')} · ${lockType === 'pin' ? t('applock_settings.pin_label') : t('applock_settings.pwd_label')}`
                    : t('applock_settings.off')}
                </p>
                <p style={{ fontSize: 12, color: '#B0B8C4', marginTop: 4, marginBottom: 0 }}>
                  {enabled
                    ? t('applock_settings.on_desc')
                    : t('applock_settings.off_desc')}
                </p>
              </div>
            </SurfaceCard>

            {!enabled ? (
              <button
                onClick={startSetup}
                style={{
                  background: 'linear-gradient(135deg,#00C2B2,#009E90)',
                  color: '#fff',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 15,
                  border: 'none',
                  padding: '14px 0',
                  cursor: 'pointer',
                }}
              >
                {t('applock_settings.setup')}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* ── Biometric section ────────────────────────── */}
                <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: bioAvailable ? 1 : 0.5,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: '#E6FAF9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        color: '#009E90',
                        flexShrink: 0,
                      }}>
                        ☁️
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14', margin: 0 }}>
                          {t('applock_settings.bio_title')}
                        </p>
                        <p style={{ fontSize: 12, color: '#B0B8C4', marginTop: 2, marginBottom: 0 }}>
                          {!bioAvailable
                            ? t('applock_settings.bio_not_supported')
                            : biometricEnabled
                            ? t('applock_settings.bio_active')
                            : t('applock_settings.bio_hint')}
                        </p>
                      </div>
                    </div>
                    {bioAvailable && (
                      <Toggle
                        value={biometricEnabled}
                        onChange={(v) => v ? handleEnableBiometric() : handleDisableBiometric()}
                      />
                    )}
                  </div>
                  {bioAvailable && biometricEnabled && (
                    <div style={{ padding: '0 16px 12px' }}>
                      <p style={{ fontSize: 12, color: '#00C2B2', margin: 0 }}>
                        ✓ {t('applock_settings.bio_registered', { type: lockType === 'pin' ? 'PIN' : t('lock.type_password') })}
                      </p>
                    </div>
                  )}
                  {bioAvailable && !biometricEnabled && (
                    <div style={{ padding: '0 16px 12px' }}>
                      <p style={{ fontSize: 12, color: '#B0B8C4', margin: 0 }}>
                        {t('applock_settings.bio_optional', { type: lockType === 'pin' ? 'PIN' : t('lock.type_password') })}
                      </p>
                    </div>
                  )}
                </SurfaceCard>

                {/* Change / disable */}
                <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', divideY: '1px solid #F0F2F7' }}>
                    <button
                      onClick={startSetup}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid #F0F2F7',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>🔑</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14' }}>
                        {t('applock_settings.change_pin', {
                          type: lockType === 'pin' ? 'PIN' : t('lock.type_password'),
                          other: lockType === 'pin' ? t('lock.type_password') : 'PIN',
                        })}
                      </span>
                    </button>
                    <button
                      onClick={handleDisable}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>🗑️</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#E11D48' }}>
                        {t('applock_settings.disable')}
                      </span>
                    </button>
                  </div>
                </SurfaceCard>
              </div>
            )}
          </>
        )}

        {/* ── Step: choose type ───────────────────────────────────── */}
        {step === 'choose' && (
          <SurfaceCard style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>
                {t('applock_settings.choose_type')}
              </p>
              <p style={{ fontSize: 12, color: '#B0B8C4', marginTop: 4, marginBottom: 0 }}>
                {t('applock_settings.choose_desc')}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { value: 'pin',      icon: '🔢', label: t('applock_settings.pin_label'),  desc: t('applock_settings.pin_desc') },
                { value: 'password', icon: '🔤', label: t('applock_settings.pwd_label'),  desc: t('applock_settings.pwd_desc') },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setChosenType(opt.value)}
                  style={{
                    flex: 1,
                    padding: '16px 8px',
                    borderRadius: 14,
                    border: chosenType === opt.value ? '2px solid #00C2B2' : '2px solid #E9ECF0',
                    background: chosenType === opt.value ? 'rgba(0,194,178,0.07)' : '#F8F9FB',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{opt.icon}</span>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{opt.label}</p>
                  <p style={{ fontSize: 10, color: '#B0B8C4', textAlign: 'center', margin: 0 }}>{opt.desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('set1')}
              style={{
                background: 'linear-gradient(135deg,#00C2B2,#009E90)',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 15,
                border: 'none',
                padding: '14px 0',
                cursor: 'pointer',
              }}
            >
              {t('applock_settings.continue_with', {
                type: chosenType === 'pin' ? t('applock_settings.pin_label') : t('applock_settings.pwd_label'),
              })}
            </button>
            <button
              onClick={() => setStep('idle')}
              style={{ background: 'none', border: 'none', fontSize: 14, color: '#B0B8C4', textAlign: 'center', cursor: 'pointer', padding: '4px 0' }}
            >
              {t('common.cancel')}
            </button>
          </SurfaceCard>
        )}

        {/* ── Step: set PIN (first entry) ──────────────────────────── */}
        {step === 'set1' && chosenType === 'pin' && (
          <SurfaceCard style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', padding: 24 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0, textAlign: 'center' }}>
              {t('applock_settings.enter_new_pin')}
            </p>
            <PinPad pin={pin1} onChange={handlePin1} />
            {error && <p style={{ fontSize: 12, color: '#E11D48', margin: 0, textAlign: 'center' }}>{error}</p>}
            <button
              onClick={() => setStep('idle')}
              style={{ background: 'none', border: 'none', fontSize: 14, color: '#B0B8C4', cursor: 'pointer', padding: '4px 0' }}
            >
              {t('common.cancel')}
            </button>
          </SurfaceCard>
        )}

        {/* ── Step: confirm PIN ──────────────────────────────────────── */}
        {step === 'set2' && chosenType === 'pin' && (
          <SurfaceCard style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', padding: 24 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0, textAlign: 'center' }}>
              {t('applock_settings.confirm_pin')}
            </p>
            <PinPad pin={pin2} onChange={handlePin2} />
            {error && <p style={{ fontSize: 12, color: '#E11D48', margin: 0, textAlign: 'center' }}>{error}</p>}
            {saving && <p style={{ fontSize: 12, color: '#B0B8C4', margin: 0, textAlign: 'center' }}>{t('common.saving')}</p>}
            <button
              onClick={() => { setStep('choose'); setPin1(''); setPin2(''); }}
              style={{ background: 'none', border: 'none', fontSize: 14, color: '#B0B8C4', cursor: 'pointer', padding: '4px 0' }}
            >
              {t('common.back')}
            </button>
          </SurfaceCard>
        )}

        {/* ── Step: confirm identity before disable ─────────────────── */}
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
          <SurfaceCard>
            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>
                {t('applock_settings.set_password')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#B0B8C4' }}>
                  {t('applock_settings.pwd_min')}
                </label>
                <input
                  type="password"
                  value={pwd1}
                  onChange={(e) => { setPwd1(e.target.value); setError(''); }}
                  placeholder="Enter password"
                  autoFocus
                  style={{
                    minHeight: 48,
                    padding: '0 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#F0F2F7',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#0A0D14',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#B0B8C4' }}>
                  {t('applock_settings.pwd_confirm')}
                </label>
                <input
                  type="password"
                  value={pwd2}
                  onChange={(e) => { setPwd2(e.target.value); setError(''); }}
                  placeholder="Confirm password"
                  style={{
                    minHeight: 48,
                    padding: '0 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#F0F2F7',
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#0A0D14',
                    outline: 'none',
                  }}
                />
              </div>
              {error && <p style={{ fontSize: 12, color: '#E11D48', margin: 0 }}>{error}</p>}
              {saving && <p style={{ fontSize: 12, color: '#B0B8C4', margin: 0 }}>{t('common.saving')}</p>}
              <button
                type="submit"
                disabled={!pwd1 || !pwd2 || saving}
                style={{
                  background: 'linear-gradient(135deg,#00C2B2,#009E90)',
                  color: '#fff',
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 15,
                  border: 'none',
                  padding: '14px 0',
                  cursor: !pwd1 || !pwd2 || saving ? 'not-allowed' : 'pointer',
                  opacity: !pwd1 || !pwd2 || saving ? 0.5 : 1,
                }}
              >
                {saving ? t('common.saving') : t('applock_settings.set_password')}
              </button>
              <button
                type="button"
                onClick={() => setStep('choose')}
                style={{ background: 'none', border: 'none', fontSize: 14, color: '#B0B8C4', textAlign: 'center', cursor: 'pointer', padding: '4px 0' }}
              >
                {t('common.back')}
              </button>
            </form>
          </SurfaceCard>
        )}

      </div>
    </div>
  );
}
