import { useNavigate } from 'react-router-dom';
import { useUnreadCount } from '../hooks/useNotifications';
import { useAuthStore } from '../store/authStore';

function Avatar() {
  const profile = useAuthStore((s) => s.profile);
  const user    = useAuthStore((s) => s.user);

  const url      = profile?.avatarUrl;
  const name     = profile?.name || user?.displayName || '';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/profile')}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(135deg, #00C2B2, #0B7FAD)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {url ? (
        <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
          {initials || '?'}
        </span>
      )}
    </button>
  );
}

function BellButton() {
  const navigate = useNavigate();
  const { data: count = 0 } = useUnreadCount();

  return (
    <button
      onClick={() => navigate('/notifications')}
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span style={{
          position: 'absolute',
          top: 7,
          right: 7,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#E11D48',
          border: '1.5px solid #F0F2F7',
        }} />
      )}
    </button>
  );
}

function BackButton({ onPress }) {
  return (
    <button
      onClick={onPress}
      style={{
        width: 38,
        height: 38,
        borderRadius: '12px',
        background: '#FFFFFF',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0A0D14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}

export default function TopBar({
  title,
  subtitle,
  onBack,
  showBack = false,
  action,
  showBell = false,
  showSearch = false,
  greeting,
}) {
  const navigate = useNavigate();
  const hasBack  = !!(onBack || showBack);

  function handleBack() {
    if (onBack) onBack();
    else navigate(-1);
  }

  // ── Root mode (main pages, no back button) ─────────────────────────────
  if (!hasBack) {
    return (
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px 10px',
        background: 'transparent',
      }}>
        {/* Left: avatar + greeting/title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Avatar />
          <div style={{ minWidth: 0 }}>
            {greeting && (
              <p style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', lineHeight: 1, marginBottom: 2 }}>
                {greeting}
              </p>
            )}
            {title && (
              <h1 style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#0A0D14',
                lineHeight: 1.2,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {title}
              </h1>
            )}
          </div>
        </div>

        {/* Right: actions + bell */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {showSearch && (
            <button
              onClick={() => navigate('/search')}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: '#FFFFFF',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          )}
          {action}
          {(showBell || !hasBack) && <BellButton />}
        </div>
      </header>
    );
  }

  // ── Back mode (sub-pages with back navigation) ─────────────────────────
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px',
      background: '#F0F2F7',
      minHeight: 56,
    }}>
      <BackButton onPress={handleBack} />

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <h1 style={{
            fontSize: 17,
            fontWeight: 800,
            color: '#0A0D14',
            margin: 0,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {title}
          </h1>
        )}
        {subtitle && (
          <p style={{ fontSize: 11, fontWeight: 500, color: '#B0B8C4', margin: '2px 0 0', lineHeight: 1 }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {showSearch && (
          <button
            onClick={() => navigate('/search')}
            style={{
              width: 38, height: 38, borderRadius: '12px',
              background: '#FFFFFF',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        )}
        {showBell && <BellButton />}
        {action}
      </div>
    </header>
  );
}
