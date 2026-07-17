import { useLocation, useNavigate } from 'react-router-dom';
import { useBusiness } from '../hooks/useBusiness';

const HIDE_ON = [
  '/login', '/signup', '/forgot-password',
  '/expense/new',
];

function HomeIcon({ active }) {
  const c = active ? '#00C2B2' : 'rgba(255,255,255,0.35)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function AnalyticsIcon({ active }) {
  const c = active ? '#00C2B2' : 'rgba(255,255,255,0.35)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6"  y1="20" x2="6"  y2="14" />
    </svg>
  );
}

function SocialIcon({ active }) {
  const c = active ? '#00C2B2' : 'rgba(255,255,255,0.35)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20c0-3.31 2.69-6 6-6s6 2.69 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 20c0-2.76-1.79-5-4-5.5" />
    </svg>
  );
}

function MoreIcon({ active }) {
  const c = active ? '#00C2B2' : 'rgba(255,255,255,0.35)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5"  cy="12" r="1.2" fill={c} stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill={c} stroke="none" />
      <circle cx="19" cy="12" r="1.2" fill={c} stroke="none" />
    </svg>
  );
}

function BusinessIcon({ active }) {
  const c = active ? '#00C2B2' : 'rgba(255,255,255,0.35)';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="8" y1="14" x2="16" y2="14" />
    </svg>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: business } = useBusiness();

  if (HIDE_ON.some(p => location.pathname.startsWith(p))) return null;

  const isBusinessMode = location.pathname.startsWith('/business');

  function isActive(path) {
    if (path === '/home') return location.pathname === '/home';
    if (path === '/social') return ['/social', '/balances', '/groups', '/tabs'].some(p => location.pathname.startsWith(p));
    return location.pathname.startsWith(path);
  }

  // Dynamic last tab: Business mode when in /business/*, else More
  const lastTab = isBusinessMode
    ? { key: 'business', label: 'Business', path: '/home',   Icon: HomeIcon }
    : business
    ? { key: 'more',     label: 'More',     path: '/more',   Icon: MoreIcon, hasDot: true }
    : { key: 'more',     label: 'More',     path: '/more',   Icon: MoreIcon };

  const LEFT_TABS = [
    { key: 'home',      label: 'Home',   path: '/home',     Icon: HomeIcon },
    { key: 'analytics', label: 'Stats',  path: '/analytics', Icon: AnalyticsIcon },
  ];
  const RIGHT_TABS = [
    { key: 'social', label: 'Social', path: '/social', Icon: SocialIcon },
    lastTab,
  ];

  function renderTab({ key, label, path, Icon, hasDot }) {
    const active = isActive(path) || (key === 'business' && isBusinessMode);
    return (
      <button
        key={key}
        onClick={() => {
          if (key === 'business') {
            navigate('/home'); // exit business mode
          } else if (isBusinessMode && key === 'more') {
            navigate('/business');
          } else {
            navigate(path);
          }
        }}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '3px', height: '48px', borderRadius: '20px',
          background: active ? 'rgba(255,255,255,0.11)' : 'transparent',
          border: 'none', cursor: 'pointer', padding: '0 4px',
          transition: 'background 0.15s', position: 'relative',
        }}
      >
        <Icon active={active} />
        <span style={{
          fontSize: '9px', fontWeight: 700,
          color: active ? '#00C2B2' : 'rgba(255,255,255,0.35)',
          letterSpacing: '0.02em', lineHeight: 1,
        }}>
          {isBusinessMode && key === 'business' ? 'Personal' : label}
        </span>
        {hasDot && !isBusinessMode && (
          <span style={{
            position: 'absolute', top: 6, right: 10,
            width: 6, height: 6, borderRadius: '50%',
            background: '#00C2B2',
          }} />
        )}
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      {/* Business mode banner */}
      {isBusinessMode && business && (
        <div style={{
          position: 'absolute', top: -32, left: '50%', transform: 'translateX(-50%)',
          background: '#00C2B2', borderRadius: 999, padding: '4px 14px',
          fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.06em',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          🏢 {business.name || 'Business Mode'}
        </div>
      )}

      <nav
        style={{
          background: '#0F1624',
          borderRadius: '28px',
          height: '64px',
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
          minWidth: '320px',
          maxWidth: '420px',
          width: 'calc(100% - 32px)',
        }}
      >
        {LEFT_TABS.map(renderTab)}

        {/* FAB — center */}
        <button
          onClick={() => navigate(isBusinessMode ? '/business/jobs/new' : '/expense/new')}
          style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #00C2B2, #009E90)',
            boxShadow: '0 4px 20px rgba(0,194,178,0.5)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, margin: '0 6px', transition: 'transform 0.15s',
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.94)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onTouchStart={e => e.currentTarget.style.transform = 'scale(0.94)'}
          onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {RIGHT_TABS.map(renderTab)}
      </nav>
    </div>
  );
}
