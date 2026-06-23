import { useState } from 'react';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
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

function dueColor(days) {
  if (days <= 1)  return 'text-red-500 bg-red-50 dark:bg-red-900/20';
  if (days <= 3)  return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
  if (days <= 7)  return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
  return 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800';
}

function dueLabel(days) {
  if (days < 0)   return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days}d`;
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-5 pb-8 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-1" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {initial ? 'Edit Subscription' : 'Add Subscription'}
        </h2>

        {/* Name + Logo row */}
        <div className="flex gap-3">
          <div className="w-16">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Logo</label>
            <input
              type="text"
              value={form.logo}
              onChange={(e) => set('logo', e.target.value)}
              placeholder="📺"
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-2 py-2.5 text-xl text-center outline-none focus:ring-2 focus:ring-violet-400"
              maxLength={2}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Netflix"
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-400"
              required
              autoFocus
            />
          </div>
        </div>

        {/* Amount + Cycle */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Amount (₹)</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0"
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-400"
              required
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Billing cycle</label>
            <select
              value={form.billingCycle}
              onChange={(e) => set('billingCycle', e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-400"
            >
              {CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Category + Next due */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Category</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-400"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Next due</label>
            <input
              type="date"
              value={form.nextDueDate}
              onChange={(e) => set('nextDueDate', e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-400"
              required
            />
          </div>
        </div>

        {/* Auto-pay toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={form.isAutoPay}
              onChange={(e) => set('isAutoPay', e.target.checked)}
              className="sr-only"
            />
            <div className={`w-10 h-6 rounded-full transition-colors ${form.isAutoPay ? 'bg-violet-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isAutoPay ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300">Auto-pay enabled</span>
        </label>

        {/* Note */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Note (optional)</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="Any note…"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-60 text-white font-bold py-3 rounded-2xl text-sm transition-colors"
        >
          {saving ? 'Saving…' : 'Save Subscription'}
        </button>
      </form>
    </div>
  );
}

export default function SubscriptionsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
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
    const color = dueColor(sub.daysUntilDue);
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800">
        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center text-xl shrink-0">
          {sub.logo || '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{sub.name}</p>
            {sub.isAutoPay && <span className="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 px-1.5 py-0.5 rounded-full">Auto</span>}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {CYCLES.find((c) => c.value === sub.billingCycle)?.label} · {sub.category}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white">₹{Number(sub.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
            {dueLabel(sub.daysUntilDue)} · {format(new Date(sub.nextDueDate), 'dd MMM')}
          </span>
        </div>
        <div className="flex flex-col gap-1 ml-1 shrink-0">
          <button onClick={() => openEdit(sub)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs">✏️</button>
          <button onClick={() => renew.mutate(sub.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-xs" title="Mark paid & advance due date">✓</button>
          <button onClick={() => handleDelete(sub.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs">🗑️</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="Subscriptions" showBack />

      {/* Monthly burn hero */}
      <div className="mx-4 mt-4 mb-3 bg-violet-500 rounded-2xl px-5 py-4 text-white shrink-0">
        <p className="text-xs font-medium opacity-70 mb-1">{active.length} active subscription{active.length !== 1 ? 's' : ''}</p>
        <p className="text-3xl font-bold tracking-tight">₹{Math.round(monthlyBurn).toLocaleString('en-IN')}<span className="text-lg font-normal opacity-70">/mo</span></p>
        <p className="text-xs opacity-60 mt-1">Monthly equivalent burn</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-300 dark:text-gray-600 text-sm">Loading…</div>
        ) : allSubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-6">
            <span className="text-4xl">📱</span>
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center">No subscriptions tracked yet</p>
            <button onClick={() => setShowForm(true)} className="bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl">+ Add Subscription</button>
          </div>
        ) : (
          <>
            {/* Due soon section */}
            {dueSoon.length > 0 && (
              <div>
                <p className="px-4 pt-2 pb-1 text-xs font-semibold text-orange-500 uppercase tracking-wide">⏰ Due this week</p>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {dueSoon.map((s) => <SubCard key={s.id} sub={s} />)}
                </div>
              </div>
            )}

            {/* All active */}
            {active.length > 0 && (
              <div>
                <p className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Active</p>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {active.map((s) => <SubCard key={s.id} sub={s} />)}
                </div>
              </div>
            )}

            {/* Inactive */}
            {inactive.length > 0 && (
              <div>
                <button
                  onClick={() => setShowInactive((v) => !v)}
                  className="w-full px-4 py-2 flex items-center justify-between text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide"
                >
                  <span>Inactive ({inactive.length})</span>
                  <span>{showInactive ? '▲' : '▼'}</span>
                </button>
                {showInactive && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700 opacity-60">
                    {inactive.map((s) => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800">
                        <span className="text-2xl shrink-0">{s.logo || '📦'}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 line-through">{s.name}</p>
                          <p className="text-xs text-gray-400">₹{Number(s.amount).toLocaleString('en-IN')} · {s.billingCycle}</p>
                        </div>
                        <button onClick={() => handleToggleActive(s)} className="text-xs text-violet-500 font-semibold px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-900/20">Reactivate</button>
                        <button onClick={() => handleDelete(s.id)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 text-xs">🗑️</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        className="fixed bottom-20 right-5 w-14 h-14 bg-violet-500 hover:bg-violet-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-30 active:scale-95 transition-transform"
        aria-label="Add subscription"
      >
        +
      </button>

      {showForm && (
        <SubscriptionForm
          initial={editing ? {
            name:        editing.name,
            amount:      String(editing.amount),
            currency:    editing.currency || 'INR',
            billingCycle: editing.billingCycle,
            nextDueDate: format(new Date(editing.nextDueDate), 'yyyy-MM-dd'),
            category:    editing.category,
            logo:        editing.logo || '',
            isAutoPay:   editing.isAutoPay,
            note:        editing.note || '',
          } : null}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
        />
      )}

      <BottomNav />
    </div>
  );
}
