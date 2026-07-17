import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const STEPS = [
  {
    emoji: '💳',
    title: 'Set up a payment method',
    body: 'Add UPI, cash, or your credit cards so every expense tracks how you paid.',
    cta: 'Add Payment Method',
    path: '/settings/payment-types',
  },
  {
    emoji: '📝',
    title: 'Log your first expense',
    body: 'Tap the + button anytime to record a purchase in seconds.',
    cta: 'Add Expense',
    path: '/expense/new',
  },
  {
    emoji: '🤝',
    title: 'Split with someone',
    body: 'Add a friend or family member to track who owes what.',
    cta: 'Add a Person',
    path: '/settings/people',
  },
];

const STORAGE_KEY = 'hk-onboarded';

export default function OnboardingFlow() {
  const jwt = useAuthStore((s) => s.jwt);
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!jwt) return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, [jwt]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  function handleCta() {
    const s = STEPS[step];
    if (step < STEPS.length - 1) {
      setStep((p) => p + 1);
    } else {
      dismiss();
      navigate(s.path);
    }
  }

  function handleSkipStep() {
    if (step < STEPS.length - 1) {
      setStep((p) => p + 1);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      background: 'rgba(10,13,20,0.6)',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '28px 28px 0 0',
        padding: '28px 24px 48px',
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === step ? '#00C2B2' : '#E9ECF0',
                transition: 'width 0.3s, background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 56, lineHeight: 1, marginBottom: 16 }}>{current.emoji}</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0A0D14', margin: '0 0 10px' }}>{current.title}</h2>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>{current.body}</p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleCta}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
              color: '#fff', fontWeight: 800, fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {step < STEPS.length - 1 ? `${current.cta} →` : current.cta}
          </button>
          <button
            onClick={handleSkipStep}
            style={{
              width: '100%', padding: '12px',
              borderRadius: 14, border: 'none', background: 'none',
              color: '#B0B8C4', fontWeight: 600, fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {step < STEPS.length - 1 ? 'Skip for now' : 'Maybe later'}
          </button>
        </div>

        {/* Dismiss X */}
        <button
          onClick={dismiss}
          style={{
            position: 'absolute', top: 16, right: 20,
            background: '#F0F2F7', border: 'none', cursor: 'pointer',
            width: 28, height: 28, borderRadius: '50%',
            fontSize: 14, color: '#B0B8C4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
