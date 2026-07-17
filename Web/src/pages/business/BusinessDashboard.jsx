import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness, useCreateBusiness, useBusinessPL, usePartnerInvites, useAcceptPartner, useDeclinePartner } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import HeroCard from '../../components/ui/HeroCard';
import ProgressBar from '../../components/ui/ProgressBar';
import MenuRow from '../../components/ui/MenuRow';

const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function SetupFlow({ onCreate }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [locations, setLocations] = useState([{ name: '' }]);
  const create = useCreateBusiness();

  const handleSubmit = async () => {
    await create.mutateAsync({ name, tagline, locations });
    onCreate();
  };

  const inputStyle = {
    width: '100%',
    background: '#F0F2F7',
    border: 'none',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 15,
    fontWeight: 600,
    color: '#0A0D14',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <SurfaceCard style={{ padding: 24 }}>
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#B0B8C4', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>
            ← Back
          </button>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏭</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0A0D14', margin: 0 }}>Set up your business</h1>
            <p style={{ fontSize: 13, color: '#B0B8C4', margin: '6px 0 0' }}>One-time setup — takes 30 seconds</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Business name</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Tagline</label>
              <input style={inputStyle} value={tagline} onChange={e => setTagline(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Locations</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {locations.map((l, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <input style={{ ...inputStyle, flex: 1 }} value={l.name} onChange={e => setLocations(ls => ls.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    {locations.length > 1 && (
                      <button onClick={() => setLocations(ls => ls.filter((_, j) => j !== i))}
                        style={{ padding: '8px 12px', borderRadius: 10, background: '#FFF1F3', color: '#E11D48', border: 'none', cursor: 'pointer', fontSize: 13 }}>✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setLocations(ls => [...ls, { name: '' }])}
                  style={{ fontSize: 13, fontWeight: 700, color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '4px 0' }}>
                  + Add location
                </button>
              </div>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={create.isPending || !name.trim()}
            style={{ width: '100%', marginTop: 20, padding: '14px 0', borderRadius: 12, background: 'linear-gradient(135deg, #00C2B2 0%, #00A896 100%)', color: '#fff', fontWeight: 800, fontSize: 15, border: 'none', cursor: create.isPending || !name.trim() ? 'not-allowed' : 'pointer', opacity: create.isPending || !name.trim() ? 0.6 : 1 }}>
            {create.isPending ? 'Creating…' : 'Create Business →'}
          </button>
        </SurfaceCard>
      </div>
    </div>
  );
}

function PendingInviteCard({ invite, onAccepted }) {
  const navigate = useNavigate();
  const accept = useAcceptPartner();
  const decline = useDeclinePartner();
  const [declined, setDeclined] = useState(false);

  if (declined) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <SurfaceCard style={{ padding: 24 }}>
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#B0B8C4', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>
            ← Back
          </button>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏭</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0A0D14', margin: 0 }}>Business Invite</h1>
            <p style={{ fontSize: 13, color: '#B0B8C4', margin: '6px 0 0' }}>You've been invited to join a business</p>
          </div>

          <div style={{ background: 'rgba(0,194,178,0.06)', border: '1px solid rgba(0,194,178,0.2)', borderRadius: 16, padding: 16, textAlign: 'center', marginBottom: 20 }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#00C2B2', margin: 0 }}>{invite.business.name}</p>
            {invite.business.tagline && <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{invite.business.tagline}</p>}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, color: '#6B7280' }}>
              {(() => {
                const owner = invite.business?.partners?.[0]?.user;
                return (
                  <>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,194,178,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#00C2B2' }}>
                      {owner?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span>Invited by <strong style={{ color: '#0A0D14' }}>{owner?.name || owner?.email || 'Business Owner'}</strong></span>
                  </>
                );
              })()}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={async () => { await decline.mutateAsync(invite.id); navigate('/'); }}
              disabled={decline.isPending || accept.isPending}
              style={{ flex: 1, padding: '14px 0', borderRadius: 12, border: '1.5px solid #E9ECF0', background: '#fff', color: '#6B7280', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: decline.isPending || accept.isPending ? 0.5 : 1 }}>
              {decline.isPending ? '…' : 'Decline'}
            </button>
            <button
              onClick={async () => { await accept.mutateAsync(invite.id); onAccepted(); }}
              disabled={accept.isPending || decline.isPending}
              style={{ flex: 1, padding: '14px 0', borderRadius: 12, background: 'linear-gradient(135deg, #00C2B2 0%, #00A896 100%)', color: '#fff', fontSize: 14, fontWeight: 800, border: 'none', cursor: 'pointer', opacity: accept.isPending || decline.isPending ? 0.5 : 1 }}>
              {accept.isPending ? 'Joining…' : 'Accept & Join'}
            </button>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const { data: business, isLoading, refetch } = useBusiness();
  const { data: invites = [], isLoading: invitesLoading } = usePartnerInvites();
  const { data: pl } = useBusinessPL({}, { enabled: !isLoading && !!business });

  if (isLoading || invitesLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#B0B8C4', fontSize: 15 }}>Loading…</p>
    </div>
  );

  if (!business && invites.length > 0) {
    return <PendingInviteCard invite={invites[0]} onAccepted={() => refetch()} />;
  }

  if (!business) return <SetupFlow onCreate={() => refetch()} />;

  const recentJobs = pl?.jobs?.slice(0, 5) || [];
  const revenue = pl?.revenue || 0;
  const expenses = (pl?.revenue || 0) - (pl?.netProfit || 0);
  const profit = pl?.netProfit || 0;

  const navItems = [
    { icon: '🖨️', iconBg: 'linear-gradient(135deg, #6366F1, #8B5CF6)', label: 'Jobs', sublabel: `${pl?.jobCount || 0} this month`, to: '/business/jobs' },
    { icon: '📦', iconBg: 'linear-gradient(135deg, #F59E0B, #FBBF24)', label: 'Inventory', to: '/business/inventory' },
    { icon: '👤', iconBg: 'linear-gradient(135deg, #3B82F6, #60A5FA)', label: 'Customers', to: '/business/customers' },
    { icon: '📊', iconBg: 'linear-gradient(135deg, #00C2B2, #00D896)', label: 'P&L Report', to: '/business/pl' },
    { icon: '💸', iconBg: 'linear-gradient(135deg, #F43F5E, #FB7185)', label: 'Expenses', to: '/business/expenses' },
    { icon: '⚙️', iconBg: 'linear-gradient(135deg, #6B7280, #9CA3AF)', label: 'Settings', to: '/business/settings' },
  ];

  const jobStatusVariant = s =>
    s === 'DELIVERED' ? 'active' :
    s === 'IN_PROGRESS' ? 'requested' :
    s === 'PRINTED' ? 'purple' : 'neutral';

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title="Business" showBack />

      <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Hero card */}
        <HeroCard>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.55)', margin: '0 0 2px' }}>
            {business.tagline || 'Business Dashboard'}
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 6px', lineHeight: 1.2 }}>
            {business.name}
          </p>
          <p style={{ fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 4px', lineHeight: 1 }}>
            {fmt(revenue)}
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#00C2B2', margin: 0 }}>
            Revenue this month · {pl?.jobCount || 0} jobs
          </p>

          {revenue > 0 && (
            <div style={{ marginTop: 14 }}>
              <ProgressBar pct={Math.round(((profit) / revenue) * 100)} height={4} />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '5px 0 0' }}>
                {Math.round(pl?.avgMarginPct || 0)}% avg margin
              </p>
            </div>
          )}
        </HeroCard>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Revenue', value: fmt(revenue), color: '#059669' },
            { label: 'Expenses', value: fmt(expenses), color: '#E11D48' },
            { label: 'Profit', value: fmt(profit), color: '#00C2B2' },
          ].map(s => (
            <SurfaceCard key={s.label} style={{ padding: '12px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#B0B8C4', margin: '0 0 4px' }}>{s.label}</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
            </SurfaceCard>
          ))}
        </div>

        {/* Nav menu */}
        <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
          {navItems.map((item, i) => (
            <MenuRow
              key={item.label}
              icon={item.icon}
              iconBg={item.iconBg}
              label={item.label}
              sublabel={item.sublabel}
              onClick={() => navigate(item.to)}
              isFirst={i === 0}
            />
          ))}
        </SurfaceCard>

        {/* Recent jobs */}
        {recentJobs.length > 0 && (
          <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#0A0D14', margin: 0 }}>Recent Jobs</p>
              <button onClick={() => navigate('/business/jobs')} style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer' }}>See all →</button>
            </div>
            {recentJobs.map((j, i) => (
              <div key={j.id} onClick={() => navigate(`/business/jobs/${j.id}`)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #F0F2F7', cursor: 'pointer' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</p>
                  <p style={{ fontSize: 12, color: '#B0B8C4', margin: '2px 0 0' }}>{j.customer?.name || 'No customer'} · {j.location?.name}</p>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 12, flexShrink: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#0A0D14', margin: '0 0 4px' }}>{fmt(j.actualPrice || j.suggestedPrice)}</p>
                  <Badge variant={jobStatusVariant(j.status)} label={j.status} />
                </div>
              </div>
            ))}
          </SurfaceCard>
        )}

      </div>
    </div>
  );
}
