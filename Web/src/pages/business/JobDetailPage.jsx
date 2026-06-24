import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJob, useUpdateJob } from '../../hooks/useBusiness';
import { useAccounts } from '../../hooks/useAccounts';
import TopBar from '../../components/TopBar';

const fmt = n => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN')}`;
const STATUS_COLORS = { QUOTED:'bg-gray-100 text-gray-600', IN_PROGRESS:'bg-blue-100 text-blue-700',
  PRINTED:'bg-purple-100 text-purple-700', DELIVERED:'bg-green-100 text-green-700', CANCELLED:'bg-red-100 text-red-600' };
const STATUSES = ['QUOTED','IN_PROGRESS','PRINTED','DELIVERED','CANCELLED'];

function Row({ label, value, accent }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-semibold ${accent || 'text-gray-900 dark:text-white'}`}>{value}</span>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJob(id);
  const updateJob = useUpdateJob();
  const { data: accounts = [] } = useAccounts();
  const [actualInput, setActualInput] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [saving, setSaving] = useState(false);

  if (isLoading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><p className="text-gray-400">Loading…</p></div>;
  if (!job) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Not found</p></div>;

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10">
      <TopBar title={job.title} onBack={() => navigate('/business/jobs')} />

      <div className="px-4 pt-4 space-y-4">
        {/* Header card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${STATUS_COLORS[job.status]}`}>{job.status}</span>
            <p className="text-xs text-gray-400">{job.location?.name} · {new Date(job.orderDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
          </div>
          {job.customer && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">👤 {job.customer.name}{job.customer.phone && ` · ${job.customer.phone}`}</p>}
          {job.description && <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{job.description}</p>}

          {/* Price summary */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">True cost</p>
              <p className="font-bold text-sm text-gray-900 dark:text-white">{fmt(job.trueCost)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Suggested</p>
              <p className="font-bold text-sm text-primary-600 dark:text-primary-400">{fmt(job.suggestedPrice)}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${ap > 0 ? (profit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20') : 'bg-gray-50 dark:bg-gray-700'}`}>
              <p className="text-xs text-gray-400 mb-1">Charged</p>
              <p className={`font-bold text-sm ${ap > 0 ? (profit >= 0 ? 'text-green-700' : 'text-red-600') : 'text-gray-400'}`}>{ap > 0 ? fmt(ap) : '—'}</p>
            </div>
          </div>

          {ap > 0 && (
            <div className="mt-3 flex justify-between text-sm bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
              <span className="text-gray-400">Profit</span>
              <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{profit >= 0 ? '+' : ''}{fmt(profit)} ({Math.round(margin)}%)</span>
            </div>
          )}
        </div>

        {/* Update actual price */}
        {job.status !== 'CANCELLED' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Record Payment Received</p>
            <div className="flex gap-2 mb-3">
              <input className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                type="number" placeholder={`₹${Math.round(n(job.suggestedPrice))}`}
                value={actualInput} onChange={e => setActualInput(e.target.value)} />
              <button onClick={saveActual} disabled={!actualInput || saving}
                className="px-4 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-60">
                {saving ? '…' : 'Save'}
              </button>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Credit to account (money received into)</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                value={creditAccountId || job.creditAccountId || ''}
                onChange={e => setCreditAccountId(e.target.value)}>
                <option value="">-- No account tracking --</option>
                {accounts.filter(a => a.type !== 'CREDIT_CARD').map(a => (
                  <option key={a.id} value={a.id}>{a.icon || ''} {a.name} ({a.type})</option>
                ))}
              </select>
              {(creditAccountId || job.creditAccountId) && !job.creditRecorded && (
                <p className="text-xs text-green-600 mt-1">✓ Income will be credited to this account when you save the price.</p>
              )}
              {job.creditRecorded && (
                <p className="text-xs text-gray-400 mt-1">✓ Income already recorded in account.</p>
              )}
            </div>
          </div>
        )}

        {/* Status flow */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Update Status</p>
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.filter(s => s !== job.status && s !== 'CANCELLED').map(s => (
              <button key={s} onClick={() => changeStatus(s)} disabled={updateJob.isPending}
                className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${STATUS_COLORS[s]} border-current/20 disabled:opacity-60`}>
                {s.replace('_', ' ')}
              </button>
            ))}
            {job.status !== 'CANCELLED' && (
              <button onClick={() => changeStatus('CANCELLED')} disabled={updateJob.isPending}
                className="py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-500 border border-red-200 disabled:opacity-60">
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Cost breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cost Breakdown</p>
          {[['Material', job.materialCost], ['Electricity', job.electricityCost], ['Depreciation', job.depreciationCost],
            ['Labour', job.labourCost], ['Packaging', job.packagingCost], ['Add-ons', job.addOnsCost],
            ['Failure markup', job.failureMarkup], ['Delivery', job.deliveryCost]].map(([label, val]) =>
            n(val) > 0.01 && <Row key={label} label={label} value={fmt(val)} />)}
        </div>

        {/* Items */}
        {job.items?.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Job Items</p>
            {job.items.map(i => (
              <div key={i.id} className="flex justify-between py-1.5 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div><p className="text-sm font-medium text-gray-900 dark:text-white">{i.name}</p>
                  <p className="text-xs text-gray-400">{i.type} · ×{Number(i.quantity)}</p></div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{fmt(i.totalCost)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Machine snapshot */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Snapshot</p>
          <Row label="Filament cost" value={`₹${n(job.filamentCostPerKg).toFixed(0)}/kg`} />
          <Row label="Grams used" value={`${n(job.gramsUsed).toFixed(1)}g`} />
          <Row label="Print time" value={`${n(job.printTimeHr).toFixed(1)}h`} />
          <Row label="Failure rate" value={`${n(job.failureRatePct)}%`} />
          <Row label="Target margin" value={`${n(job.targetMarginPct)}%`} />
        </div>
      </div>
    </div>
  );
}
