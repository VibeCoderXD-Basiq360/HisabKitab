import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ALL_ACTIONS = [
  { key: 'search',        emoji: '🔍', label: 'Search',        path: '/search',             color: 'linear-gradient(135deg,#0B7FAD,#0A5F8A)' },
  { key: 'calendar',      emoji: '📅', label: 'Calendar',      path: '/calendar',           color: 'linear-gradient(135deg,#7C3AED,#6D28D9)' },
  { key: 'plan',          emoji: '📊', label: 'Plan',          path: '/plan',               color: 'linear-gradient(135deg,#10B981,#059669)' },
  { key: 'accounts',      emoji: '🏦', label: 'Accounts',      path: '/accounts',           color: 'linear-gradient(135deg,#00C2B2,#009E90)' },
  { key: 'income',        emoji: '💰', label: 'Income',        path: '/income',             color: 'linear-gradient(135deg,#6366F1,#4F46E5)' },
  { key: 'wealth',        emoji: '💎', label: 'Wealth',        path: '/wealth',             color: 'linear-gradient(135deg,#7C3AED,#6D28D9)' },
  { key: 'loans',         emoji: '💸', label: 'Loans',         path: '/loans',              color: 'linear-gradient(135deg,#F43F5E,#E11D48)' },
  { key: 'recurring',     emoji: '🔄', label: 'Recurring',     path: '/settings/recurring', color: 'linear-gradient(135deg,#0B7FAD,#0A5F8A)' },
  { key: 'activity',      emoji: '📋', label: 'Activity',      path: '/activity',           color: 'linear-gradient(135deg,#374151,#1F2937)' },
  { key: 'groups',        emoji: '👥', label: 'Groups',        path: '/groups',             color: 'linear-gradient(135deg,#6366F1,#4F46E5)' },
  { key: 'tabs',          emoji: '📎', label: 'Shared Tabs',   path: '/tabs',               color: 'linear-gradient(135deg,#F59E0B,#D97706)' },
  { key: 'subscriptions', emoji: '💳', label: 'Subscriptions', path: '/subscriptions',      color: 'linear-gradient(135deg,#10B981,#059669)' },
  { key: 'export',        emoji: '📤', label: 'Export',        path: '/settings/export',    color: 'linear-gradient(135deg,#374151,#1F2937)' },
];

const DEFAULT_KEYS = ['search', 'calendar', 'plan', 'accounts', 'income', 'wealth', 'loans', 'recurring'];

const SIZE = {
  small:  { cols: 5, box: 42, emoji: 18, label: 10, gap: 6,  tileGap: 8  },
  medium: { cols: 4, box: 52, emoji: 22, label: 11, gap: 8,  tileGap: 10 },
  large:  { cols: 3, box: 60, emoji: 26, label: 12, gap: 10, tileGap: 12 },
};

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export default function QuickActionsCard() {
  const navigate = useNavigate();

  const [activeKeys, setActiveKeys] = useState(() => load('hk_quick_actions', DEFAULT_KEYS));
  const [tileSize,   setTileSize]   = useState(() => localStorage.getItem('hk_quick_size') || 'medium');
  const [editing,    setEditing]    = useState(false);

  const cfg     = SIZE[tileSize];
  const actions = activeKeys.map(k => ALL_ACTIONS.find(a => a.key === k)).filter(Boolean);

  function toggleKey(key) {
    setActiveKeys(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem('hk_quick_actions', JSON.stringify(next));
      return next;
    });
  }

  function changeSize(s) {
    setTileSize(s);
    localStorage.setItem('hk_quick_size', s);
  }

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 0' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Quick Actions
          </span>
          <button
            onClick={() => setEditing(true)}
            style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Customize ✏️
          </button>
        </div>

        {/* Grid */}
        {actions.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#B0B8C4', fontSize: 13, padding: '24px 0' }}>
            No actions selected —{' '}
            <button onClick={() => setEditing(true)} style={{ color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              customize
            </button>
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cfg.cols}, 1fr)`,
            gap: cfg.tileGap,
            padding: `12px 12px 16px`,
          }}>
            {actions.map(action => (
              <button
                key={action.key}
                onClick={() => navigate(action.path)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: cfg.gap, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div style={{
                  width: cfg.box, height: cfg.box, borderRadius: 16,
                  background: action.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: cfg.emoji,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
                }}>
                  {action.emoji}
                </div>
                <span style={{ fontSize: cfg.label, fontWeight: 700, color: '#374151', textAlign: 'center', lineHeight: 1.3 }}>
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Customization sheet */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} onClick={() => setEditing(false)} />
          <div style={{
            position: 'relative', background: '#fff', borderRadius: '24px 24px 0 0',
            width: '100%', maxWidth: 512, margin: '0 auto',
            maxHeight: '85vh', overflowY: 'auto',
            padding: '8px 20px 48px', display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 999, margin: '8px auto 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0A0D14', margin: 0 }}>Customize Quick Actions</h2>
              <button
                onClick={() => setEditing(false)}
                style={{ fontSize: 13, fontWeight: 700, color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Done
              </button>
            </div>

            {/* Size selector */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Icon Size
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['small', 'Small', '5 per row'], ['medium', 'Medium', '4 per row'], ['large', 'Large', '3 per row']].map(([val, label, sub]) => (
                  <button
                    key={val}
                    onClick={() => changeSize(val)}
                    style={{
                      flex: 1, padding: '10px 4px', borderRadius: 14, border: '2px solid',
                      borderColor: tileSize === val ? '#00C2B2' : '#E9ECF0',
                      background: tileSize === val ? '#E6FAF9' : '#F7F8FA',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: tileSize === val ? '#00C2B2' : '#374151' }}>{label}</span>
                    <span style={{ fontSize: 10, color: '#B0B8C4' }}>{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions picker */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Actions
                <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
                  · {activeKeys.length} selected
                </span>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {ALL_ACTIONS.map(action => {
                  const on = activeKeys.includes(action.key);
                  return (
                    <button
                      key={action.key}
                      onClick={() => toggleKey(action.key)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        padding: '12px 6px', borderRadius: 14, border: '2px solid',
                        borderColor: on ? '#00C2B2' : '#E9ECF0',
                        background: on ? '#E6FAF9' : '#F7F8FA',
                        cursor: 'pointer', position: 'relative',
                      }}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: on ? action.color : '#E9ECF0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, transition: 'background 0.15s',
                      }}>
                        {action.emoji}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: on ? '#00C2B2' : '#374151', textAlign: 'center', lineHeight: 1.3 }}>
                        {action.label}
                      </span>
                      {on && (
                        <div style={{
                          position: 'absolute', top: 6, right: 6,
                          width: 16, height: 16, borderRadius: '50%',
                          background: '#00C2B2',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, color: '#fff', fontWeight: 800, lineHeight: 1,
                        }}>✓</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
