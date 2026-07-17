import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import { useBalances } from '../../hooks/useSplits';
import { useGroups } from '../../hooks/useGroups';
import { useSharedTabs } from '../../hooks/useSharedTabs';
import { useTabGroups } from '../../hooks/useTabGroups';
import { useAuthStore } from '../../store/authStore';

const TABS = ['Balances', 'Groups', 'Tabs'];

const fmt = (n) =>
  '₹' + Math.abs(Number(n || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const TYPE_ICON = { TRIP: '✈️', HOME: '🏠', WORK: '💼', COUPLE: '💑', OTHER: '👥' };

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ── Balances Tab ───────────────────────────────────────────────────
function BalancesTab() {
  const navigate = useNavigate();
  const { data, isLoading } = useBalances();

  const owesMe = data?.owesMe || [];
  const iOwe   = data?.iOwe   || [];

  const totalOwed = owesMe.reduce((s, sp) => s + Number(sp.amount || 0), 0);
  const totalOwe  = iOwe.reduce((s, sp) => s + Number(sp.amount || 0), 0);

  // Aggregate per person
  const owesMeByPerson = {};
  owesMe.forEach((sp) => {
    const name = sp.person?.name || sp.fromUser?.name || 'Unknown';
    if (!owesMeByPerson[name]) owesMeByPerson[name] = { name, total: 0, avatar: sp.person?.avatarUrl };
    owesMeByPerson[name].total += Number(sp.amount || 0);
  });

  const iOweByPerson = {};
  iOwe.forEach((sp) => {
    const name = sp.person?.name || sp.toUser?.name || 'Unknown';
    if (!iOweByPerson[name]) iOweByPerson[name] = { name, total: 0, avatar: sp.person?.avatarUrl };
    iOweByPerson[name].total += Number(sp.amount || 0);
  });

  const owesMePeople = Object.values(owesMeByPerson);
  const iOwePeople   = Object.values(iOweByPerson);

  if (isLoading) return <p style={{ textAlign: 'center', color: '#B0B8C4', padding: '40px 0' }}>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Hero summary */}
      <div style={{
        background: 'linear-gradient(135deg, #0F1624 0%, #0B2A28 100%)',
        borderRadius: 20, padding: '18px 20px', color: '#fff',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            You're owed
          </p>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#34D399' }}>{fmt(totalOwed)}</p>
        </div>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            You owe
          </p>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#F87171' }}>{fmt(totalOwe)}</p>
        </div>
      </div>

      {owesMePeople.length === 0 && iOwePeople.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#B0B8C4' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🤝</div>
          <p style={{ fontWeight: 600, color: '#374151' }}>All settled up!</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Split an expense to see balances here.</p>
        </div>
      )}

      {owesMePeople.length > 0 && (
        <SurfaceCard>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Owe you</p>
          {owesMePeople.map((p) => (
            <div
              key={p.name}
              onClick={() => navigate('/balances')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', cursor: 'pointer', borderTop: '1px solid #F0F2F7' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #00C2B2, #009E90)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  {initials(p.name)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14' }}>{p.name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>{fmt(p.total)}</span>
            </div>
          ))}
        </SurfaceCard>
      )}

      {iOwePeople.length > 0 && (
        <SurfaceCard>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>You owe</p>
          {iOwePeople.map((p) => (
            <div
              key={p.name}
              onClick={() => navigate('/balances')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', cursor: 'pointer', borderTop: '1px solid #F0F2F7' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F87171', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  {initials(p.name)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14' }}>{p.name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E11D48' }}>{fmt(p.total)}</span>
            </div>
          ))}
        </SurfaceCard>
      )}

      {(owesMePeople.length > 0 || iOwePeople.length > 0) && (
        <button
          onClick={() => navigate('/balances')}
          style={{ width: '100%', padding: '12px', borderRadius: 14, background: '#F0F2F7', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#374151' }}
        >
          Manage Splits →
        </button>
      )}
    </div>
  );
}

// ── Groups Tab ─────────────────────────────────────────────────────
function GroupsTab() {
  const navigate = useNavigate();
  const { data: groups = [], isLoading } = useGroups();

  if (isLoading) return <p style={{ textAlign: 'center', color: '#B0B8C4', padding: '40px 0' }}>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        onClick={() => navigate('/groups/new')}
        style={{ width: '100%', padding: '12px', borderRadius: 14, background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)', color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}
      >
        + New Group
      </button>

      {groups.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#B0B8C4' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👥</div>
          <p style={{ fontWeight: 600, color: '#374151' }}>No groups yet</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Create a group for trips, home expenses, or events.</p>
        </div>
      )}

      {groups.map((g) => (
        <SurfaceCard key={g.id} onClick={() => navigate(`/groups/${g.id}`)}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #0F1624, #0B2A28)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {TYPE_ICON[g.type] || '👥'}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{g.name}</p>
                <p style={{ fontSize: 12, color: '#B0B8C4', margin: '2px 0 0' }}>{g.memberCount || g.members?.length || 0} members</p>
              </div>
            </div>
            {g.myNet !== 0 && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: g.myNet > 0 ? '#10B981' : '#E11D48', margin: 0 }}>
                  {g.myNet > 0 ? '+' : ''}{fmt(g.myNet)}
                </p>
                <p style={{ fontSize: 10, color: '#B0B8C4', margin: '2px 0 0' }}>
                  {g.myNet > 0 ? 'owed to you' : 'you owe'}
                </p>
              </div>
            )}
            {g.myNet === 0 && <Badge variant="on-track" label="Settled" />}
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}

// ── Tabs Tab ───────────────────────────────────────────────────────
function TabsTab() {
  const navigate = useNavigate();
  const profile  = useAuthStore((s) => s.profile);
  const { data: tabs = [], isLoading }       = useSharedTabs();
  const { data: tabGroups = [] }             = useTabGroups();

  const myEmail = profile?.email;

  if (isLoading) return <p style={{ textAlign: 'center', color: '#B0B8C4', padding: '40px 0' }}>Loading…</p>;

  const activeTabs   = tabs.filter((t) => t.status === 'ACTIVE');
  const pendingTabs  = tabs.filter((t) => t.status === 'PENDING');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {tabGroups.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Tab Groups</p>
          {tabGroups.map((tg) => (
            <SurfaceCard key={tg.id} onClick={() => navigate(`/tab-groups/${tg.id}`)} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{tg.name}</p>
                  <p style={{ fontSize: 12, color: '#B0B8C4', margin: '2px 0 0' }}>{tg.tabCount || tg.tabs?.length || 0} tabs</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D9DDE5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </SurfaceCard>
          ))}
        </div>
      )}

      {pendingTabs.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Pending Invite</p>
          {pendingTabs.map((t) => {
            const other = t.initiatorEmail === myEmail ? t.partnerEmail : t.initiatorEmail;
            return (
              <SurfaceCard key={t.id} onClick={() => navigate('/tabs')} style={{ marginBottom: 8, borderLeft: '3px solid #F59E0B' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{t.name || 'Shared Tab'}</p>
                    <p style={{ fontSize: 12, color: '#B0B8C4', margin: '2px 0 0' }}>{other}</p>
                  </div>
                  <Badge variant="warning" label="Pending" />
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      {activeTabs.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Active Tabs</p>
          {activeTabs.map((t) => {
            const other = t.initiatorEmail === myEmail ? t.partnerEmail : t.initiatorEmail;
            const myBalance = t.myBalance || 0;
            return (
              <SurfaceCard key={t.id} onClick={() => navigate(`/tabs/${t.id}`)} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{t.name || 'Shared Tab'}</p>
                    <p style={{ fontSize: 12, color: '#B0B8C4', margin: '2px 0 0' }}>{other}</p>
                  </div>
                  {myBalance !== 0 && (
                    <p style={{ fontSize: 13, fontWeight: 700, color: myBalance > 0 ? '#10B981' : '#E11D48' }}>
                      {myBalance > 0 ? '+' : ''}{fmt(myBalance)}
                    </p>
                  )}
                  {myBalance === 0 && <Badge variant="on-track" label="Settled" />}
                </div>
              </SurfaceCard>
            );
          })}
        </div>
      )}

      {activeTabs.length === 0 && pendingTabs.length === 0 && tabGroups.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#B0B8C4' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📎</div>
          <p style={{ fontWeight: 600, color: '#374151' }}>No shared tabs yet</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Start a tab with a roommate or partner for ongoing shared expenses.</p>
        </div>
      )}

      <button
        onClick={() => navigate('/tabs')}
        style={{ width: '100%', padding: '12px', borderRadius: 14, background: '#F0F2F7', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#374151' }}
      >
        Manage Tabs →
      </button>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────
export default function SocialPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('Balances');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title="Social" />

      {/* Tab switcher */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', background: '#fff', borderRadius: 16, padding: 4, gap: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 12,
                fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: tab === t ? '#00C2B2' : 'transparent',
                color: tab === t ? '#fff' : '#B0B8C4',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {t === 'Balances' ? '⚖️ Balances' : t === 'Groups' ? '👥 Groups' : '📎 Tabs'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '14px 16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'Balances' && <BalancesTab />}
        {tab === 'Groups'   && <GroupsTab />}
        {tab === 'Tabs'     && <TabsTab />}
      </div>
    </div>
  );
}
