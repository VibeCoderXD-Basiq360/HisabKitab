import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJob, useUpdateJob } from '../../hooks/useBusiness';
import { useAccounts } from '../../hooks/useAccounts';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';

const fmt = n => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN')}`;

const STATUS_BADGE = {
  QUOTED:      { variant: 'neutral',   label: 'Quoted' },
  IN_PROGRESS: { variant: 'requested', label: 'In Progress' },
  PRINTED:     { variant: 'purple',    label: 'Printed' },
  DELIVERED:   { variant: 'active',    label: 'Delivered' },
  CANCELLED:   { variant: 'danger',    label: 'Cancelled' },
};
const STATUSES = ['QUOTED','IN_PROGRESS','PRINTED','DELIVERED','CANCELLED'];

const STATUS_BTN_STYLE = {
  QUOTED:      { background: '#F3F4F6', color: '#6B7280' },
  IN_PROGRESS: { background: '#EEF2FF', color: '#6366F1' },
  PRINTED:     { background: '#F5F3FF', color: '#7C3AED' },
  DELIVERED:   { background: '#F0FDF4', color: '#059669' },
  CANCELLED:   { background: '#FFF1F3', color: '#E11D48' },
};

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJob(id);
  const updateJob = useUpdateJob();
  const { data: accounts = [] } = useAccounts();
  const [actualInput, setActualInput] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [saving, setSaving] = useState(false);

  if (isLoading) return (
    <div style={{ minHeight:'100vh', background:'#F0F2F7', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#B0B8C4' }}>Loading…</p>
    </div>
  );
  if (!job) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#B0B8C4' }}>Not found</p>
    </div>
  );

  const n = v => Number(v) || 0;
  const ap = n(job.actualPrice);
  const profit = n(job.profit);
  const margin = n(job.marginPct);

  async function changeStatus(status) {
    await updateJob.mutateAsync({ id: job.id, status });
  }

  async function saveActual() {
    setSaving(true);
    await updateJob.mutateAsync({
      id: job.id,
      actualPrice: Number(actualInput),
      ...(creditAccountId && { creditAccountId }),
    });
    setActualInput('');
    setSaving(false);
  }

  const statusInfo = STATUS_BADGE[job.status] || { variant: 'neutral', label: job.status };

  return (
    <div style={{ minHeight:'100vh', background:'#F0F2F7', paddingBottom:'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar title={job.title} onBack={() => navigate('/business/jobs')} />

      <div style={{ padding:'16px 16px 0', display:'flex', flexDirection:'column', gap:14 }}>

        {/* Hero card — dark navy gradient */}
        <div style={{
          background:'linear-gradient(135deg,#0D1B2A 0%,#1B2E45 60%,#0D2137 100%)',
          borderRadius:22,
          padding:'22px 20px 20px',
          boxShadow:'0 6px 28px rgba(13,27,42,0.25)',
        }}>
          {/* Status + date row */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <Badge variant={statusInfo.variant} label={statusInfo.label} style={{ fontSize:10 }} />
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.45)' }}>
              {job.location?.name && `${job.location.name} · `}
              {new Date(job.orderDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
            </span>
          </div>

          {/* Title */}
          <p style={{ fontSize:20, fontWeight:800, color:'#fff', marginBottom:4, lineHeight:1.2 }}>{job.title}</p>

          {/* Customer */}
          {job.customer && (
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:10 }}>
              👤 {job.customer.name}{job.customer.phone && ` · ${job.customer.phone}`}
            </p>
          )}
          {job.description && (
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', marginBottom:14 }}>{job.description}</p>
          )}

          {/* Price grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom: ap > 0 ? 12 : 0 }}>
            {[
              { label:'True Cost', value:fmt(job.trueCost), color:'rgba(255,255,255,0.7)' },
              { label:'Suggested', value:fmt(job.suggestedPrice), color:'#00C2B2' },
              { label:'Charged', value: ap > 0 ? fmt(ap) : '—', color: ap > 0 ? (profit >= 0 ? '#059669' : '#E11D48') : 'rgba(255,255,255,0.35)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background:'rgba(255,255,255,0.07)', borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>{label}</p>
                <p style={{ fontSize:13, fontWeight:700, color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Job value hero */}
          <div style={{ textAlign:'center', marginBottom:4 }}>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:2 }}>Job Value</p>
            <p style={{ fontSize:28, fontWeight:800, color:'#fff', lineHeight:1 }}>{fmt(job.suggestedPrice)}</p>
          </div>

          {ap > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', background:'rgba(255,255,255,0.06)', borderRadius:12, padding:'10px 14px', marginTop:12 }}>
              <span style={{ fontSize:13, color:'rgba(255,255,255,0.5)' }}>Profit</span>
              <span style={{ fontSize:13, fontWeight:700, color: profit >= 0 ? '#059669' : '#E11D48' }}>
                {profit >= 0 ? '+' : ''}{fmt(profit)} ({Math.round(margin)}%)
              </span>
            </div>
          )}
        </div>

        {/* Record Payment */}
        {job.status !== 'CANCELLED' && (
          <SurfaceCard>
            <p style={{ fontSize:11, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
              Record Payment Received
            </p>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <input
                style={{ flex:1, padding:'11px 14px', background:'#F0F2F7', border:'none', borderRadius:10, fontSize:16, fontWeight:700, color:'#0A0D14', outline:'none' }}
                type="number"
                placeholder={`₹${Math.round(n(job.suggestedPrice))}`}
                value={actualInput}
                onChange={e => setActualInput(e.target.value)}
              />
              <button
                onClick={saveActual}
                disabled={!actualInput || saving}
                style={{
                  padding:'11px 20px', borderRadius:10, border:'none',
                  background: (!actualInput || saving) ? '#E5E7EB' : 'linear-gradient(135deg,#00C2B2,#009E91)',
                  color: (!actualInput || saving) ? '#9CA3AF' : '#fff',
                  fontWeight:700, fontSize:14, cursor: (!actualInput || saving) ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? '…' : 'Save'}
              </button>
            </div>
            <div>
              <label style={{ fontSize:11, color:'#B0B8C4', display:'block', marginBottom:6 }}>Credit to account (money received into)</label>
              <select
                style={{ width:'100%', padding:'11px 14px', background:'#F0F2F7', border:'none', borderRadius:10, fontSize:13, color:'#0A0D14', outline:'none' }}
                value={creditAccountId || job.creditAccountId || ''}
                onChange={e => setCreditAccountId(e.target.value)}
              >
                <option value="">-- No account tracking --</option>
                {accounts.filter(a => a.type !== 'CREDIT_CARD').map(a => (
                  <option key={a.id} value={a.id}>{a.icon || ''} {a.name} ({a.type})</option>
                ))}
              </select>
              {(creditAccountId || job.creditAccountId) && !job.creditRecorded && (
                <p style={{ fontSize:11, color:'#059669', marginTop:6 }}>✓ Income will be credited to this account when you save.</p>
              )}
              {job.creditRecorded && (
                <p style={{ fontSize:11, color:'#B0B8C4', marginTop:6 }}>✓ Income already recorded in account.</p>
              )}
            </div>
          </SurfaceCard>
        )}

        {/* Update Status */}
        <SurfaceCard>
          <p style={{ fontSize:11, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
            Update Status
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
            {STATUSES.filter(s => s !== job.status && s !== 'CANCELLED').map(s => {
              const st = STATUS_BTN_STYLE[s] || {};
              return (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={updateJob.isPending}
                  style={{
                    padding:'9px 4px', borderRadius:10, border:'none',
                    background: st.background, color: st.color,
                    fontSize:11, fontWeight:700, cursor:'pointer', opacity: updateJob.isPending ? 0.6 : 1,
                  }}
                >
                  {s.replace('_', ' ')}
                </button>
              );
            })}
            {job.status !== 'CANCELLED' && (
              <button
                onClick={() => changeStatus('CANCELLED')}
                disabled={updateJob.isPending}
                style={{ padding:'9px 4px', borderRadius:10, border:'none', background:'#FFF1F3', color:'#E11D48', fontSize:11, fontWeight:700, cursor:'pointer', opacity: updateJob.isPending ? 0.6 : 1 }}
              >
                Cancel
              </button>
            )}
          </div>
        </SurfaceCard>

        {/* Cost Breakdown */}
        <SurfaceCard>
          <p style={{ fontSize:11, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
            Cost Breakdown
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {[
              ['Material', job.materialCost], ['Electricity', job.electricityCost],
              ['Depreciation', job.depreciationCost], ['Labour', job.labourCost],
              ['Packaging', job.packagingCost], ['Add-ons', job.addOnsCost],
              ['Failure markup', job.failureMarkup], ['Delivery', job.deliveryCost],
            ].map(([label, val]) => n(val) > 0.01 && (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'8px 0', borderBottom:'1px solid #F0F2F7' }}>
                <span style={{ fontSize:13, color:'#B0B8C4' }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:600, color:'#0A0D14' }}>{fmt(val)}</span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        {/* Job Items */}
        {job.items?.length > 0 && (
          <SurfaceCard>
            <p style={{ fontSize:11, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
              Job Items
            </p>
            {job.items.map(i => (
              <div key={i.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid #F0F2F7' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:'#0A0D14' }}>{i.name}</p>
                  <p style={{ fontSize:11, color:'#B0B8C4', marginTop:2 }}>{i.type} · ×{Number(i.quantity)}</p>
                </div>
                <p style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{fmt(i.totalCost)}</p>
              </div>
            ))}
          </SurfaceCard>
        )}

        {/* Machine Snapshot */}
        <SurfaceCard>
          <p style={{ fontSize:11, fontWeight:700, color:'#B0B8C4', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
            Snapshot
          </p>
          {[
            ['Filament cost', `₹${n(job.filamentCostPerKg).toFixed(0)}/kg`],
            ['Grams used', `${n(job.gramsUsed).toFixed(1)}g`],
            ['Print time', `${n(job.printTimeHr).toFixed(1)}h`],
            ['Failure rate', `${n(job.failureRatePct)}%`],
            ['Target margin', `${n(job.targetMarginPct)}%`],
          ].map(([label, value]) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'8px 0', borderBottom:'1px solid #F0F2F7' }}>
              <span style={{ fontSize:13, color:'#B0B8C4' }}>{label}</span>
              <span style={{ fontSize:13, fontWeight:600, color:'#0A0D14' }}>{value}</span>
            </div>
          ))}
        </SurfaceCard>

      </div>
    </div>
  );
}
