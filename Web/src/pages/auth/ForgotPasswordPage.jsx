import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { auth } from '../../lib/firebase';

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

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch {
      setError('Could not send reset email. Check the address and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#F0F2F7' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#00C2B2,#009E90)', marginBottom: 14 }}>
            <span style={{ fontSize: 26, color: '#fff' }}>₹</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0A0D14', margin: '0 0 4px' }}>{t('auth.reset_password_title')}</h1>
          <p style={{ fontSize: 14, color: '#B0B8C4', margin: 0 }}>{t('auth.reset_password_desc')}</p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 22, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#059669', margin: '0 0 8px' }}>{t('auth.reset_email_sent')}</p>
              <p style={{ fontSize: 13, color: '#B0B8C4', margin: '0 0 24px' }}>{t('auth.reset_email_hint')}</p>
              <Link
                to="/login"
                style={{ color: '#00C2B2', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
              >
                {t('auth.back_to_signin')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <StyledInput
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              {error && <p style={{ fontSize: 13, color: '#E11D48', margin: 0 }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#00C2B2,#009E90)', color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4 }}
              >
                {loading ? t('common.loading') : t('auth.send_reset_link')}
              </button>
            </form>
          )}
        </div>

        {!sent && (
          <p style={{ textAlign: 'center', fontSize: 14, marginTop: 20 }}>
            <Link to="/login" style={{ color: '#00C2B2', fontWeight: 700, textDecoration: 'none' }}>
              {t('auth.back_to_signin')}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
