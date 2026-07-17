import { useState } from 'react';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import {
  useSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
  useRenewSubscription,
} from '../../hooks/useSubscriptions';

const CYCLES = [
  { value: 'MONTHLY',     label: 'Monthly',     months: 1  },
  { value: 'QUARTERLY',   label: 'Quarterly',   months: 3  },
  { value: 'HALF_YEARLY', label: 'Half-yearly', months: 6  },
  { value: 'YEARLY',      label: 'Yearly',      months: 12 },
];

const CATEGORIES = ['Entertainment', 'Utilities', 'Software', 'Health', 'Education', 'Finance', 'Transport', 'Other'];

const EMPTY = {
  name: '', amount: '', currency: 'INR', billingCycle: 'MONTHLY',
  nextDueDate: format(new Date(), 'yyyy-MM-dd'),
  category: 'Entertainment', logo: '', isAutoPay: false, note: '',
};

function dueBadgeVariant(days) {
  if (days <= 0) return 'due-today';
  if (days <= 3) return 'warning';
  if (days <= 7) return 'pending';
  return 'on-track';
}

function dueLabel(days) {
  if (days < 0)   return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days}d`;
}

function SubscriptionForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || EMPTY);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.amount || !form.nextDueDate) return;
    onSave(form);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: 40, height: 4, background: '#E9ECF0', borderRadius: 99, margin: '0 auto 4px' }} />
        <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0A0D14', margin: 0 }}>
          {initial ? 'Edit Subscription' : 'Add Subscription'}
        </h2>

        {/* Name + Logo row */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 64 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Logo</label>
            <input
              type="text"
              value={form.logo}
              onChange={(e) => set('logo', e.target.value)}
              placeholder="📺"
              style={{ width: '100%', background: '#F0F2F7', borderRadius: 12, padding: '10px 8px', fontSize: 20, textAlign: 'center', border: 'none', outline: 'none', boxSizing: 'border-box' }}
              maxLength={2}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Netflix"
              style={{ width: '100%', background: '#F0F2F7', borderRadius: 12, padding: '10px 16px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
              required
              autoFocus
            />
          </div>
        </div>

        {/* Amount + Cycle */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Amount (₹)</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0"
              style={{ width: '100%', background: '#F0F2F7', borderRadius: 12, padding: '10px 16px', fontSize: 14, fontWeight: 700, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Billing cycle</label>
            <select
              value={form.billingCycle}
              onChange={(e) => set('billingCycle', e.target.value)}
              style={{ width: '100%', background: '#F0F2F7', borderRadius: 12, padding: '10px 12px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
            >
              {CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Category + Next due */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Category</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              style={{ width: '100%', background: '#F0F2F7', borderRadius: 12, padding: '10px 12px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Next due</label>
            <input
              type="date"
              value={form.nextDueDate}
              onChange={(e) => set('nextDueDate', e.target.value)}
              style={{ width: '100%', background: '#F0F2F7', borderRadius: 12, padding: '10px 12px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
              required
            />
          </div>
        </div>

        {/* Auto-pay toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="checkbox"
              checked={form.isAutoPay}
              onChange={(e) => set('isAutoPay', e.target.checked)}
              style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
            />
            <div style={{
              width: 40, height: 24, borderRadius: 99,
              background: form.isAutoPay ? '#00C2B2' : '#E9ECF0',
              transition: 'background 0.2s',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute',
                top: 4, width: 16, height: 16,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                transition: 'transform 0.2s',
                transform: form.isAutoPay ? 'translateX(20px)' : 'translateX(4px)',
              }} />
            </div>
          </div>
          <span style={{ fontSize: 14, color: '#374151' }}>Auto-pay enabled</span>
        </label>

        {/* Note */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', display: 'block', marginBottom: 4 }}>Note (optional)</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="Any note…"
            style={{ width: '100%', background: '#F0F2F7', borderRadius: 12, padding: '10px 16px', fontSize: 14, color: '#0A0D14', border: 'none', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%',
            background: saving ? '#B0B8C4' : 'linear-gradient(135deg,#00C2B2 0%,#00A89A 100%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            padding: '14px 0',
            borderRadius: 16,
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save Subscription'}
        </button>
      </form>
    </div>
  );
}

export default function SubscriptionsPage() {
  const [showForm, setShowForm]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: allSubs = [], isLoading } = useSubscriptions();
  const create = useCreateSubscription();
  const upd    = useUpdateSubscription();
  const del    = useDeleteSubscription();
  const renew  = useRenewSubscription();

  const active   = allSubs.filter((s) => s.isActive);
  const inactive = allSubs.filter((s) => !s.isActive);
  const dueSoon  = active.filter((s) => s.daysUntilDue <= 7);

  const monthlyBurn = active.reduce((s, sub) => s + (sub.monthlyAmount || 0), 0);

  function handleSave(form) {
    const payload = { ...form, amount: Number(form.amount) };
    if (editing) {
      upd.mutate({ id: editing.id, ...payload }, { onSuccess: closeForm });
    } else {
      create.mutate(payload, { onSuccess: closeForm });
    }
  }

  function openEdit(sub) {
    setEditing(sub);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this subscription?')) return;
    del.mutate(id);
  }

  function handleToggleActive(sub) {
    upd.mutate({ id: sub.id, isActive: !sub.isActive });
  }

  const saving = create.isPending || upd.isPending;

  function SubCard({ sub }) {
    const variant = dueBadgeVariant(sub.daysUntilDue);
    const cycleLabel = CYCLES.find((c) => c.value === sub.billingCycle)?.label || sub.billingCycle;

    return (
      <SurfaceCard style={{ padding: '12px 14px', borderRadius: 14, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Category emoji icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: '#F0F2F7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0,
          }}>
            {sub.logo || '📦'}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontWeight: 800, color: '#0A0D14', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sub.name}
              </span>
              {sub.isAutoPay && (
                <Badge variant="on-track" label="Auto" />
              )}
            </div>
            <span style={{ color: '#B0B8C4', fontSize: 11 }}>
              {cycleLabel} · {sub.category}
            </span>
          </div>

          {/* Amount + due badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <span style={{ fontWeight: 800, color: '#E11D48', fontSize: 15 }}>
              ₹{Number(sub.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <Badge
              variant={variant}
              label={`${dueLabel(sub.daysUntilDue)} · ${format(new Date(sub.nextDueDate), 'dd MMM')}`}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 4, flexShrink: 0 }}>
            <button
              onClick={() => openEdit(sub)}
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#F0F2F7', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}
              title="Edit"
            >✏️</button>
            <button
              onClick={() => renew.mutate(sub.id)}
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#F0FDF4', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}
              title="Mark paid & advance due date"
            >✓</button>
            <button
              onClick={() => handleDelete(sub.id)}
              style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#FFF1F3', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E11D48' }}
              title="Delete"
            >🗑️</button>
          </div>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title="Subscriptions" showBack />

      {/* Monthly burn hero — dark navy gradient */}
      <div style={{
        margin: '16px 16px 12px',
        background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 100%)',
        borderRadius: 20,
        padding: '20px 24px',
        color: '#fff',
        flexShrink: 0,
      }}>
        <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.6, marginBottom: 4 }}>
          {active.length} active subscription{active.length !== 1 ? 's' : ''}
        </p>
        <p style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>
          ₹{Math.round(monthlyBurn).toLocaleString('en-IN')}
          <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.6 }}>/mo</span>
        </p>
        <p style={{ fontSize: 11, opacity: 0.5 }}>Monthly equivalent burn</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#B0B8C4', fontSize: 14 }}>
            Loading…
          </div>
        ) : allSubs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 40 }}>📱</span>
            <p style={{ color: '#B0B8C4', fontSize: 14 }}>No subscriptions tracked yet</p>
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: 'linear-gradient(135deg,#00C2B2 0%,#00A89A 100%)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                padding: '10px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
              }}
            >
              + Add Subscription
            </button>
          </div>
        ) : (
          <>
            {/* Due soon section */}
            {dueSoon.length > 0 && (
              <div style={{ padding: '0 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em', paddingTop: 12, paddingBottom: 6 }}>
                  ⏰ Due this week
                </p>
                {dueSoon.map((s) => <SubCard key={s.id} sub={s} />)}
              </div>
            )}

            {/* All active */}
            {active.length > 0 && (
              <div style={{ padding: '0 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 800, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', paddingTop: 12, paddingBottom: 6 }}>
                  Active
                </p>
                {active.map((s) => <SubCard key={s.id} sub={s} />)}
              </div>
            )}

            {/* Inactive */}
            {inactive.length > 0 && (
              <div style={{ padding: '0 16px' }}>
                <button
                  onClick={() => setShowInactive((v) => !v)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 11, fontWeight: 800, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em',
                    paddingTop: 12, paddingBottom: 6, background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  <span>Inactive ({inactive.length})</span>
                  <span>{showInactive ? '▲' : '▼'}</span>
                </button>
                {showInactive && (
                  <div style={{ opacity: 0.6 }}>
                    {inactive.map((s) => (
                      <SurfaceCard key={s.id} style={{ padding: '12px 14px', borderRadius: 14, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 24, flexShrink: 0 }}>{s.logo || '📦'}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: '#B0B8C4', textDecoration: 'line-through' }}>{s.name}</p>
                            <p style={{ fontSize: 12, color: '#B0B8C4' }}>₹{Number(s.amount).toLocaleString('en-IN')} · {s.billingCycle}</p>
                          </div>
                          <button
                            onClick={() => handleToggleActive(s)}
                            style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2', padding: '6px 12px', borderRadius: 12, background: '#E6FAF9', border: 'none', cursor: 'pointer' }}
                          >
                            Reactivate
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#FFF1F3', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E11D48' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </SurfaceCard>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB — teal gradient */}
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        style={{
          position: 'fixed',
          bottom: 'calc(80px + env(safe-area-inset-bottom))',
          right: 20,
          width: 56, height: 56,
          borderRadius: 999,
          background: 'linear-gradient(135deg,#00C2B2 0%,#00A89A 100%)',
          color: '#fff',
          fontSize: 28, fontWeight: 300,
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,194,178,0.40)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 30,
        }}
        aria-label="Add subscription"
      >
        +
      </button>

      {showForm && (
        <SubscriptionForm
          initial={editing ? {
            name:         editing.name,
            amount:       String(editing.amount),
            currency:     editing.currency || 'INR',
            billingCycle: editing.billingCycle,
            nextDueDate:  format(new Date(editing.nextDueDate), 'yyyy-MM-dd'),
            category:     editing.category,
            logo:         editing.logo || '',
            isAutoPay:    editing.isAutoPay,
            note:         editing.note || '',
          } : null}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
        />
      )}
    </div>
  );
}
