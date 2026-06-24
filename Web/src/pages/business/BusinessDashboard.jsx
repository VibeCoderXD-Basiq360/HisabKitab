import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness, useCreateBusiness, useBusinessPL, usePartnerInvites, useAcceptPartner, useDeclinePartner } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';

const fmt = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function SetupFlow({ onCreate }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [locations, setLocations] = useState([{ name: '' }]);
  const create = useCreateBusiness();

  const handleSubmit = async () => {
    await create.mutateAsync({ name, tagline, locations });
    onCreate();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-2">🏭</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Set up your business</h1>
          <p className="text-sm text-gray-400 mt-1">One-time setup — takes 30 seconds</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Business name</label>
            <input className="w-full mt-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tagline</label>
            <input className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
              value={tagline} onChange={e => setTagline(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Locations</label>
            <div className="mt-1 space-y-2">
              {locations.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                    value={l.name} onChange={e => setLocations(ls => ls.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  {locations.length > 1 && (
                    <button onClick={() => setLocations(ls => ls.filter((_, j) => j !== i))}
                      className="px-3 py-2 rounded-xl bg-red-50 text-red-500 text-sm">✕</button>
                  )}
                </div>
              ))}
              <button onClick={() => setLocations(ls => [...ls, { name: '' }])}
                className="text-sm text-primary-600 dark:text-primary-400 font-semibold">+ Add location</button>
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={create.isPending || !name.trim()}
          className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-base disabled:opacity-60">
          {create.isPending ? 'Creating…' : 'Create Business →'}
        </button>
      </div>
    </div>
  );
}

function PendingInviteCard({ invite, onAccepted }) {
  const accept = useAcceptPartner();
  const decline = useDeclinePartner();
  const [declined, setDeclined] = useState(false);

  if (declined) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-2">🏭</div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Business Invite</h1>
          <p className="text-sm text-gray-400 mt-1">You've been invited to join a business</p>
        </div>

        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">{invite.business.name}</p>
          {invite.business.tagline && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{invite.business.tagline}</p>}
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-7 h-7 rounded-full bg-primary-200 dark:bg-primary-700 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
              {invite.user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span>Invited by <strong className="text-gray-700 dark:text-gray-200">{invite.user?.name || invite.user?.email}</strong></span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={async () => { await decline.mutateAsync(invite.id); setDeclined(true); }}
            disabled={decline.isPending || accept.isPending}
            className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold disabled:opacity-50">
            {decline.isPending ? '…' : 'Decline'}
          </button>
          <button
            onClick={async () => { await accept.mutateAsync(invite.id); onAccepted(); }}
            disabled={accept.isPending || decline.isPending}
            className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-bold disabled:opacity-50">
            {accept.isPending ? 'Joining…' : 'Accept & Join'}
          </button>
        </div>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <p className="text-gray-400">Loading…</p>
    </div>
  );

  if (!business && invites.length > 0) {
    return <PendingInviteCard invite={invites[0]} onAccepted={() => refetch()} />;
  }

  if (!business) return <SetupFlow onCreate={() => refetch()} />;

  const recentJobs = pl?.jobs?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      <TopBar title={business.name} subtitle={business.tagline} />

      <div className="px-4 pt-4 space-y-4">
        {/* P&L Summary */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Revenue (MTD)', value: fmt(pl?.revenue), color: 'text-green-600 dark:text-green-400' },
            { label: 'Net Profit', value: fmt(pl?.netProfit), color: pl?.netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500' },
            { label: 'Jobs this month', value: pl?.jobCount || 0, color: 'text-primary-600 dark:text-primary-400' },
            { label: 'Avg Margin', value: `${Math.round(pl?.avgMarginPct || 0)}%`, color: 'text-primary-600 dark:text-primary-400' },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🖨️', label: 'New Job', to: '/business/jobs/new' },
            { icon: '📦', label: 'Inventory', to: '/business/inventory' },
            { icon: '👤', label: 'Customers', to: '/business/customers' },
            { icon: '📊', label: 'P&L Report', to: '/business/pl' },
            { icon: '💸', label: 'Expenses', to: '/business/expenses' },
            { icon: '⚙️', label: 'Settings', to: '/business/settings' },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.to)}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 active:scale-[0.97] transition-transform">
              <span className="text-3xl">{a.icon}</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{a.label}</span>
            </button>
          ))}
        </div>

        {/* Recent jobs */}
        {recentJobs.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Recent Jobs</p>
              <button onClick={() => navigate('/business/jobs')} className="text-xs text-primary-600 dark:text-primary-400 font-semibold">See all →</button>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {recentJobs.map(j => (
                <div key={j.id} onClick={() => navigate(`/business/jobs/${j.id}`)}
                  className="flex items-center justify-between px-4 py-3 active:bg-gray-50 dark:active:bg-gray-700 cursor-pointer">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{j.title}</p>
                    <p className="text-xs text-gray-400">{j.customer?.name || 'No customer'} · {j.location?.name}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(j.actualPrice || j.suggestedPrice)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      j.status === 'DELIVERED' ? 'bg-green-100 text-green-600' :
                      j.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-600' :
                      j.status === 'PRINTED' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-500'}`}>{j.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
