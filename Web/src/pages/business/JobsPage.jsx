import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJobs, useUpdateJob } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';

const fmt = n => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN')}`;

const STATUSES = ['QUOTED', 'IN_PROGRESS', 'PRINTED', 'DELIVERED', 'CANCELLED'];

const STATUS_LABEL = {
  QUOTED: 'Quoted',
  IN_PROGRESS: 'In Progress',
  PRINTED: 'Printed',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// Map job statuses to Badge variants
const STATUS_VARIANT = {
  QUOTED: 'awaiting',
  IN_PROGRESS: 'active',
  PRINTED: 'purple',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

// Rough progress % per status for the progress bar
const STATUS_PCT = {
  QUOTED: 15,
  IN_PROGRESS: 50,
  PRINTED: 80,
  DELIVERED: 100,
  CANCELLED: 0,
};

export default function JobsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('');
  const { data: jobs = [], isLoading } = useJobs(filter ? { status: filter } : {});
  const updateJob = useUpdateJob();

  // Stats counts from loaded jobs (all statuses, so use unfiltered if possible)
  const pending   = jobs.filter(j => j.status === 'QUOTED').length;
  const active    = jobs.filter(j => j.status === 'IN_PROGRESS').length;
  const completed = jobs.filter(j => j.status === 'DELIVERED').length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title="Jobs" showBack onBack={() => navigate('/business')} />

      <div style={{ padding: '16px 16px 0' }}>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Quoted', value: pending, variant: 'awaiting' },
            { label: 'Active', value: active, variant: 'active' },
            { label: 'Done', value: completed, variant: 'success' },
          ].map(({ label, value, variant }) => (
            <div key={label} style={{
              flex: 1,
              background: '#fff',
              borderRadius: 14,
              padding: '10px 12px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#0A0D14', lineHeight: 1.2 }}>{value}</p>
              <p style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Filter pill bar */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 12 }}>
          {['', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                flexShrink: 0,
                padding: '7px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: filter === s
                  ? 'linear-gradient(135deg, #00C2B2, #00D896)'
                  : '#E9ECF0',
                color: filter === s ? '#fff' : '#6B7280',
                transition: 'background 0.2s, color 0.2s',
              }}
            >
              {s ? STATUS_LABEL[s] : 'All'}
            </button>
          ))}
        </div>

        {/* Job list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isLoading && (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>Loading…</p>
          )}
          {!isLoading && jobs.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>No jobs found</p>
          )}
          {jobs.map(job => (
            <SurfaceCard
              key={job.id}
              onClick={() => navigate(`/business/jobs/${job.id}`)}
              style={{ padding: 16 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontWeight: 800, color: '#0A0D14', fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.title}
                  </p>
                  <p style={{ fontSize: 12, color: '#374151', marginBottom: 0 }}>
                    {job.customer?.name || '—'} · {job.location?.name} · {new Date(job.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontWeight: 800, color: '#00C2B2', fontSize: 15 }}>
                    {fmt(job.actualPrice ?? job.suggestedPrice)}
                  </p>
                  {job.profit !== null && (
                    <p style={{ fontSize: 11, fontWeight: 600, color: Number(job.profit) >= 0 ? '#059669' : '#E11D48' }}>
                      {Number(job.profit) >= 0 ? '+' : ''}{fmt(job.profit)} profit
                    </p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <ProgressBar pct={STATUS_PCT[job.status] ?? 0} style={{ marginTop: 10, marginBottom: 8 }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Badge variant={STATUS_VARIANT[job.status] || 'neutral'} label={STATUS_LABEL[job.status] || job.status} />
                <p style={{ fontSize: 11, color: '#9CA3AF' }}>True cost: {fmt(job.trueCost)}</p>
              </div>
            </SurfaceCard>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate('/business/jobs/new')}
        style={{
          position: 'fixed',
          bottom: 'calc(88px + env(safe-area-inset-bottom))',
          right: 20,
          background: 'linear-gradient(135deg, #00C2B2, #00D896)',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          padding: '14px 22px',
          fontSize: 14,
          fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,194,178,0.35)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 40,
        }}
      >
        🖨️ New Job
      </button>
    </div>
  );
}
