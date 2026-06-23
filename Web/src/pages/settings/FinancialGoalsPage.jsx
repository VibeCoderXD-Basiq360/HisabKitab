import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import {
  useFinancialGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useContributeGoal,
} from '../../hooks/useFinancialGoals';

const COLORS = [
  { key: 'emerald', label: 'Green',  bg: 'bg-emerald-500' },
  { key: 'blue',    label: 'Blue',   bg: 'bg-blue-500' },
  { key: 'violet',  label: 'Purple', bg: 'bg-violet-500' },
  { key: 'amber',   label: 'Amber',  bg: 'bg-amber-500' },
  { key: 'rose',    label: 'Rose',   bg: 'bg-rose-500' },
  { key: 'cyan',    label: 'Cyan',   bg: 'bg-cyan-500' },
];

const colorBar = {
  emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500',
  amber: 'bg-amber-500',    rose: 'bg-rose-500',  cyan: 'bg-cyan-500',
};
const colorText = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  blue:    'text-blue-600 dark:text-blue-400',
  violet:  'text-violet-600 dark:text-violet-400',
  amber:   'text-amber-600 dark:text-amber-400',
  rose:    'text-rose-600 dark:text-rose-400',
  cyan:    'text-cyan-600 dark:text-cyan-400',
};

const emptyForm = { name: '', emoji: '', targetAmount: '', savedAmount: '', deadline: '', color: 'emerald' };

function daysLeft(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86_400_000);
  return diff;
}

export default function FinancialGoalsPage() {
  const navigate = useNavigate();
  const { data: goals = [], isLoading } = useFinancialGoals();
  const createGoal    = useCreateGoal();
  const updateGoal    = useUpdateGoal();
  const deleteGoal    = useDeleteGoal();
  const contributeGoal = useContributeGoal();

  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState(emptyForm);
  const [editId, setEditId]           = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [contributeSheet, setContributeSheet] = useState(null); // { id, name }
  const [contributeAmt, setContributeAmt]     = useState('');

  function openCreate() {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(g) {
    setForm({
      name:         g.name,
      emoji:        g.emoji || '',
      targetAmount: String(Number(g.targetAmount)),
      savedAmount:  String(Number(g.savedAmount)),
      deadline:     g.deadline ? g.deadline.slice(0, 10) : '',
      color:        g.color || 'emerald',
    });
    setEditId(g.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    const payload = {
      name:         form.name.trim(),
      emoji:        form.emoji || null,
      targetAmount: Number(form.targetAmount),
      savedAmount:  form.savedAmount ? Number(form.savedAmount) : 0,
      deadline:     form.deadline || null,
      color:        form.color,
    };
    if (editId) {
      await updateGoal.mutateAsync({ id: editId, ...payload });
    } else {
      await createGoal.mutateAsync(payload);
    }
    setShowForm(false);
  }

  async function handleContribute() {
    const amt = Number(contributeAmt);
    if (!amt) return;
    await contributeGoal.mutateAsync({ id: contributeSheet.id, amount: amt });
    setContributeSheet(null);
    setContributeAmt('');
  }

  const busy = createGoal.isPending || updateGoal.isPending;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <TopBar
        title="Financial Goals"
        onBack={() => navigate('/settings')}
        action={
          <button onClick={openCreate} className="text-primary-600 dark:text-primary-400 font-semibold text-sm px-2 py-1">
            + New
          </button>
        }
      />

      <div className="px-4 pt-4 space-y-3">
        {isLoading && <p className="text-center text-gray-400 py-8 text-sm">Loading…</p>}

        {!isLoading && goals.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">🎯</div>
            <p className="font-medium text-gray-600 dark:text-gray-300">No goals yet</p>
            <p className="text-sm mt-1">Set a target — Europe trip, emergency fund, new phone…</p>
            <button
              onClick={openCreate}
              className="mt-4 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold"
            >
              Create first goal
            </button>
          </div>
        )}

        {goals.map((g) => {
          const target  = Number(g.targetAmount);
          const saved   = Number(g.savedAmount);
          const pct     = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
          const remain  = target - saved;
          const dl      = daysLeft(g.deadline);
          const barColor = colorBar[g.color] || 'bg-emerald-500';
          const txtColor = colorText[g.color] || 'text-emerald-600 dark:text-emerald-400';

          return (
            <div
              key={g.id}
              className={`bg-white dark:bg-gray-800 rounded-2xl px-4 py-4 shadow-sm ${g.isCompleted ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl">{g.emoji || '🎯'}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{g.name}</p>
                    {g.isCompleted && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Completed!</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => { setContributeSheet({ id: g.id, name: g.name }); setContributeAmt(''); }}
                    className="p-1.5 text-gray-400 hover:text-primary-500 transition-colors text-sm"
                    title="Add funds"
                  >
                    ➕
                  </button>
                  <button onClick={() => openEdit(g)} className="p-1.5 text-gray-400 hover:text-primary-500 transition-colors text-sm">✏️</button>
                  <button onClick={() => setConfirmDelete(g.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors text-sm">🗑️</button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${txtColor}`}>₹{saved.toLocaleString('en-IN')}</span>
                  <span className="text-gray-400">of ₹{target.toLocaleString('en-IN')} · {pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>₹{remain > 0 ? remain.toLocaleString('en-IN') + ' remaining' : 'Goal reached!'}</span>
                  {dl !== null && (
                    <span className={dl < 0 ? 'text-red-500' : dl <= 30 ? 'text-amber-500' : ''}>
                      {dl < 0 ? `${Math.abs(dl)}d overdue` : dl === 0 ? 'Due today' : `${dl}d left`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl p-5 w-full max-w-lg space-y-4 pb-8">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
              {editId ? 'Edit Goal' : 'New Goal'}
            </h3>

            {/* Name + emoji row */}
            <div className="flex gap-2">
              <input
                className="w-14 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-3 text-xl text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="🎯"
                value={form.emoji}
                onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
                maxLength={4}
              />
              <input
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Goal name (e.g. Europe Trip)"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Target + Saved */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Target ₹</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="100000"
                  value={form.targetAmount}
                  onChange={(e) => setForm((p) => ({ ...p, targetAmount: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Saved so far ₹</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0"
                  value={form.savedAmount}
                  onChange={(e) => setForm((p) => ({ ...p, savedAmount: e.target.value }))}
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Target Date (optional)</label>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              />
            </div>

            {/* Color */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-2">Color</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setForm((p) => ({ ...p, color: c.key }))}
                    className={`w-8 h-8 rounded-full ${c.bg} transition-transform ${form.color === c.key ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || !form.targetAmount || busy}
                className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {busy ? 'Saving…' : editId ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribute sheet */}
      {contributeSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setContributeSheet(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Add to "{contributeSheet.name}"</h3>
            <p className="text-xs text-gray-400">Use a negative number to subtract.</p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input
                type="number"
                autoFocus
                className="w-full pl-7 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="5000"
                value={contributeAmt}
                onChange={(e) => setContributeAmt(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setContributeSheet(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleContribute}
                disabled={!contributeAmt || contributeGoal.isPending}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {contributeGoal.isPending ? 'Saving…' : 'Add Funds'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Delete Goal?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">All progress will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => { await deleteGoal.mutateAsync(confirmDelete); setConfirmDelete(null); }}
                disabled={deleteGoal.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deleteGoal.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
