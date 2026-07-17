import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useExchangeRates } from '../../hooks/useExchangeRates';
import TopBar from '../../components/TopBar';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import api from '../../lib/api';

function SectionLabel({ title }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 4 }}>
      {title}
    </div>
  );
}

function GridTile({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '14px 4px', background: '#fff', borderRadius: 16, border: 'none',
        cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
    </button>
  );
}

function ListRow({ icon, label, onClick, isFirst, danger, rightSlot }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', background: 'none', border: 'none',
        borderTop: isFirst ? 'none' : '1px solid #F0F2F7',
        cursor: 'pointer', textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 17, width: 24, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: danger ? '#E11D48' : '#0A0D14' }}>{label}</span>
      {rightSlot ?? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D9DDE5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </button>
  );
}

export default function MorePage() {
  const navigate  = useNavigate();
  const { t }     = useTranslation();
  const logout    = useAuthStore((s) => s.logout);
  const profile   = useAuthStore((s) => s.profile);
  const user      = useAuthStore((s) => s.user);
  const { data: exchangeRates = [], isSuccess: ratesLoaded } = useExchangeRates();
  const showExchangeRates = !ratesLoaded || exchangeRates.length > 0;
  const [deleting, setDeleting] = useState(false);

  const { data: freshProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/user/me').then((r) => r.data),
  });

  const name      = freshProfile?.name || profile?.name || user?.displayName || 'User';
  const email     = freshProfile?.email || profile?.email || user?.email || '';
  const avatarUrl = freshProfile?.photoUrl || profile?.photoUrl || profile?.avatarUrl;
  const initials  = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  const customizeItems = [
    { icon: '🏷️', label: 'Categories',      path: '/settings/categories' },
    { icon: '💳', label: 'Payment Types',    path: '/settings/payment-types' },
    { icon: '🃏', label: 'Card Delegations', path: '/settings/card-delegations' },
    ...(showExchangeRates ? [{ icon: '💱', label: 'Exchange Rates', path: '/settings/exchange-rates' }] : []),
  ];

  async function handleDeleteAccount() {
    if (!window.confirm(t('settings.confirm_delete_1'))) return;
    if (!window.confirm(t('settings.confirm_delete_2'))) return;
    setDeleting(true);
    try {
      await api.delete('/users/me');
      await logout();
      navigate('/login', { replace: true });
    } catch {
      alert(t('settings.delete_failed'));
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title="More" />

      {/* Compact profile row */}
      <div style={{ padding: '12px 16px 0' }}>
        <div
          onClick={() => navigate('/profile')}
          style={{
            background: 'linear-gradient(140deg, #0B1A38 0%, #0A2B38 55%, #0B2A28 100%)',
            borderRadius: 18, padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(0,194,178,0.08)', pointerEvents: 'none' }} />
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: 'linear-gradient(135deg,#00C2B2,#0B7FAD)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid rgba(0,194,178,0.35)',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{initials}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Quick chips */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { emoji: '🏢', label: 'Business', path: '/business' },
          { emoji: '🔒', label: 'App Lock', path: '/settings/app-lock' },
        ].map(a => (
          <button
            key={a.path}
            onClick={() => navigate(a.path)}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', background: '#fff', borderRadius: 99, border: 'none',
              cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
              fontSize: 12, fontWeight: 700, color: '#374151',
            }}
          >
            <span style={{ fontSize: 14 }}>{a.emoji}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div style={{ padding: '14px 16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Finance — 4-col icon grid */}
        <div>
          <SectionLabel title="Finance" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { icon: '🏦', label: 'Accounts',      path: '/accounts' },
              { icon: '💰', label: 'Income',         path: '/income' },
              { icon: '💳', label: 'Subscriptions',  path: '/subscriptions' },
              { icon: '💎', label: 'Wealth',         path: '/wealth' },
            ].map(item => (
              <GridTile key={item.path} icon={item.icon} label={item.label} onClick={() => navigate(item.path)} />
            ))}
          </div>
        </div>

        {/* Planning — 2-col icon grid */}
        <div>
          <SectionLabel title="Planning" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {[
              { icon: '📊', label: 'Plan',      path: '/plan' },
              { icon: '🔄', label: 'Recurring', path: '/settings/recurring' },
            ].map(item => (
              <GridTile key={item.path} icon={item.icon} label={item.label} onClick={() => navigate(item.path)} />
            ))}
          </div>
        </div>

        {/* Activity — compact list */}
        <div>
          <SectionLabel title="Activity" />
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {[
              { icon: '🔍', label: 'Search',       path: '/search' },
              { icon: '📅', label: 'Calendar',     path: '/calendar' },
              { icon: '📋', label: 'Activity Log', path: '/activity' },
            ].map((item, idx) => (
              <ListRow key={item.path} icon={item.icon} label={item.label} isFirst={idx === 0} onClick={() => navigate(item.path)} />
            ))}
          </div>
        </div>

        {/* Social — compact list */}
        <div>
          <SectionLabel title="Social" />
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {[
              { icon: '👥', label: 'Groups',      path: '/groups' },
              { icon: '📎', label: 'Shared Tabs', path: '/tabs' },
              { icon: '🧑', label: 'People',      path: '/settings/people' },
            ].map((item, idx) => (
              <ListRow key={item.path} icon={item.icon} label={item.label} isFirst={idx === 0} onClick={() => navigate(item.path)} />
            ))}
          </div>
        </div>

        {/* Customize — 4-col icon grid */}
        <div>
          <SectionLabel title="Customize" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {customizeItems.map(item => (
              <GridTile key={item.path} icon={item.icon} label={item.label} onClick={() => navigate(item.path)} />
            ))}
          </div>
        </div>

        {/* Data — compact list */}
        <div>
          <SectionLabel title="Data" />
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {[
              { icon: '📤', label: 'Export', path: '/settings/export' },
              { icon: '📥', label: 'Import', path: '/settings/import' },
            ].map((item, idx) => (
              <ListRow key={item.path} icon={item.icon} label={item.label} isFirst={idx === 0} onClick={() => navigate(item.path)} />
            ))}
          </div>
        </div>

        {/* Preferences — language switcher */}
        <div>
          <SectionLabel title="Preferences" />
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', padding: '14px 16px' }}>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Sign out + Delete account */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <ListRow icon="🚪" label="Sign Out" isFirst danger onClick={() => { logout(); navigate('/login'); }} />
          <ListRow
            icon="🗑️"
            label={deleting ? 'Deleting…' : 'Delete Account'}
            danger
            onClick={deleting ? undefined : handleDeleteAccount}
            rightSlot={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            }
          />
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: '#B0B8C4', padding: '4px 0 8px' }}>
          HisabKitab · v1.0
        </div>
      </div>
    </div>
  );
}
