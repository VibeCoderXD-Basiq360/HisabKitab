import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';
import { useBudgets } from '../../hooks/useBudgets';
import {
  useFinancialGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useContributeGoal,
} from '../../hooks/useFinancialGoals';
import { useSavingsGoal, useUpsertSavingsGoal } from '../../hooks/useSavingsGoal';

const TABS = ['Budgets', 'Goals', 'Savings'];

const colorHex = {
  emerald: '#10B981', blue: '#3B82F6', violet: '#8B5CF6',
  amber: '#F59E0B',   rose: '#F43F5E', cyan: '#06B6D4',
};
const COLORS = [
  { key: 'emerald', bg: '#10B981' }, { key: 'blue', bg: '#3B82F6' },
  { key: 'violet', bg: '#8B5CF6' }, { key: 'amber', bg: '#F59E0B' },
  { key: 'rose',   bg: '#F43F5E' }, { key: 'cyan',  bg: '#06B6D4' },
];

function daysLeft(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / 86_400_000);
}
function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }

// ── Budgets Tab ────────────────────────────────────────────────────
function BudgetsTab() {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useBudgets();
  const withBudget    = items.filter((i) => i.budget);
  const withoutBudget = items.filter((i) => !i.budget);
  const totalBudget   = withBudget.reduce((s, i) => s + Number(i.budget.amount), 0);
  const totalSpent    = withBudget.reduce((s, i) => s + Number(i.spent), 0);
  const overallPct    = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  if (isLoading) return <p style={{ textAlign: 'center', color: '#B0B8C4', padding: '40px 0' }}>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Summary */}
      {withBudget.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #0F1624 0%, #0B2A28 100%)',
          borderRadius: 20, padding: '18px 20px', color: '#fff',
        }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Monthly Budget
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{fmt(totalSpent)}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>of {fmt(totalBudget)}</p>
            </div>
            <p style={{ fontSize: 22, fontWeight: 900, color: overallPct >= 100 ? '#F87171' : overallPct >= 80 ? '#FCD34D' : '#34D399' }}>
              {overallPct}%
            </p>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(overallPct, 100)}%`, background: overallPct >= 100 ? '#F87171' : '#00C2B2', borderRadius: 999, transition: 'width 0.5s' }} />
          </div>
        </div>
      )}

      {/* Per-category rows */}
      {withBudget.length > 0 && (
        <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
          {withBudget.map((item, idx) => {
            const pct = item.budget.amount > 0 ? Math.round((item.spent / Number(item.budget.amount)) * 100) : 0;
            return (
              <div
                key={item.categoryId}
                onClick={() => navigate('/settings/budgets')}
                style={{
                  padding: '12px 16px', cursor: 'pointer',
                  borderTop: idx === 0 ? 'none' : '1px solid #F0F2F7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{item.category?.icon || '📦'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14' }}>{item.category?.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#B0B8C4' }}>{fmt(item.spent)} / {fmt(item.budget.amount)}</span>
                    <Badge variant={pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : 'on-track'} label={`${pct}%`} />
                  </div>
                </div>
                <ProgressBar pct={Math.min(pct, 100)} />
              </div>
            );
          })}
        </SurfaceCard>
      )}

      {/* Categories without budget */}
      {withoutBudget.length > 0 && (
        <SurfaceCard>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>No Budget Set</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {withoutBudget.map((item) => (
              <button
                key={item.categoryId}
                onClick={() => navigate('/settings/budgets')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  background: '#F0F2F7', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, color: '#374151',
                }}
              >
                {item.category?.icon || '📦'} {item.category?.name} <span style={{ color: '#00C2B2' }}>+</span>
              </button>
            ))}
          </div>
        </SurfaceCard>
      )}

      {withBudget.length === 0 && withoutBudget.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#B0B8C4' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div>
          <p style={{ fontWeight: 600, color: '#374151' }}>No budgets yet</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Add categories first, then set spending limits.</p>
        </div>
      )}
    </div>
  );
}

// ── Goals Tab ──────────────────────────────────────────────────────
const emptyGoalForm = { name: '', emoji: '', targetAmount: '', savedAmount: '', deadline: '', color: 'emerald' };

function GoalsTab() {
  const { data: goals = [], isLoading } = useFinancialGoals();
  const createGoal    = useCreateGoal();
  const updateGoal    = useUpdateGoal();
  const deleteGoal    = useDeleteGoal();
  const contributeGoal = useContributeGoal();

  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(emptyGoalForm);
  const [editId, setEditId]       = useState(null);
  const [contribId, setContribId] = useState(null);
  const [contribAmt, setContribAmt] = useState('');

  function openCreate() { setForm(emptyGoalForm); setEditId(null); setShowForm(true); }
  function openEdit(g) {
    setForm({ name: g.name, emoji: g.emoji || '', targetAmount: String(g.targetAmount), savedAmount: String(g.savedAmount), deadline: g.deadline ? g.deadline.slice(0, 10) : '', color: g.color || 'emerald' });
    setEditId(g.id); setShowForm(true);
  }

  async function handleSubmit() {
    const payload = { name: form.name.trim(), emoji: form.emoji || null, targetAmount: Number(form.targetAmount), savedAmount: Number(form.savedAmount || 0), deadline: form.deadline || null, color: form.color };
    if (editId) await updateGoal.mutateAsync({ id: editId, ...payload });
    else        await createGoal.mutateAsync(payload);
    setShowForm(false);
  }

  async function handleContribute() {
    if (!contribAmt || Number(contribAmt) <= 0) return;
    await contributeGoal.mutateAsync({ id: contribId, amount: Number(contribAmt) });
    setContribId(null); setContribAmt('');
  }

  if (isLoading) return <p style={{ textAlign: 'center', color: '#B0B8C4', padding: '40px 0' }}>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        onClick={openCreate}
        style={{
          width: '100%', padding: '12px', borderRadius: 14,
          background: 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
          color: '#fff', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer',
        }}
      >
        + New Goal
      </button>

      {goals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#B0B8C4' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
          <p style={{ fontWeight: 600, color: '#374151' }}>No goals yet</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Set a savings target — vacation, emergency fund, gadget…</p>
        </div>
      )}

      {goals.map((g) => {
        const pct   = g.targetAmount > 0 ? Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100) : 0;
        const dl    = daysLeft(g.deadline);
        const color = colorHex[g.color] || '#00C2B2';
        return (
          <SurfaceCard key={g.id} style={{ borderLeft: `3px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 24 }}>{g.emoji || '🎯'}</span>
                <div>
                  <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 14, margin: 0 }}>{g.name}</p>
                  {dl !== null && !g.isCompleted && (
                    <p style={{ fontSize: 11, color: dl < 0 ? '#E11D48' : '#B0B8C4', margin: '2px 0 0' }}>
                      {dl < 0 ? `${Math.abs(dl)}d overdue` : `${dl}d left`}
                    </p>
                  )}
                  {g.isCompleted && <p style={{ fontSize: 11, color: '#10B981', margin: '2px 0 0' }}>✓ Completed</p>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openEdit(g)} style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#B0B8C4' }}>✏️</button>
                <button onClick={() => deleteGoal.mutate(g.id)} style={{ fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#B0B8C4' }}>🗑️</button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#B0B8C4', marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color, fontSize: 14 }}>{fmt(g.savedAmount)}</span>
              <span>{pct}% of {fmt(g.targetAmount)}</span>
            </div>
            <ProgressBar pct={Math.min(pct, 100)} />
            {!g.isCompleted && (
              <button
                onClick={() => { setContribId(g.id); setContribAmt(''); }}
                style={{
                  marginTop: 10, width: '100%', padding: '8px', borderRadius: 10,
                  background: '#F0F2F7', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, color: '#374151',
                }}
              >
                + Add Money
              </button>
            )}
          </SurfaceCard>
        );
      })}

      {/* Contribute sheet */}
      {contribId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setContribId(null)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', width: '100%', maxWidth: 512, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontWeight: 800, fontSize: 17, color: '#0A0D14', margin: 0 }}>Add to Goal</p>
            <input
              type="number" autoFocus inputMode="decimal" placeholder="Amount ₹"
              value={contribAmt} onChange={(e) => setContribAmt(e.target.value)}
              style={{ width: '100%', border: '1px solid #E9ECF0', borderRadius: 12, padding: '12px 16px', fontSize: 16, outline: 'none', boxSizing: 'border-box' }}
            />
            <button
              onClick={handleContribute}
              disabled={!contribAmt || contributeGoal.isPending}
              style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: '#00C2B2', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: !contribAmt ? 0.5 : 1 }}
            >
              {contributeGoal.isPending ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit goal sheet */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowForm(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', width: '100%', maxWidth: 512, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '80vh', overflowY: 'auto' }}>
            <p style={{ fontWeight: 800, fontSize: 17, color: '#0A0D14', margin: 0 }}>{editId ? 'Edit Goal' : 'New Goal'}</p>

            <div style={{ display: 'flex', gap: 8 }}>
              <input value={form.emoji} onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))} maxLength={4}
                style={{ width: 56, borderRadius: 12, border: '1px solid #E9ECF0', background: '#F7F8FA', padding: '12px 8px', fontSize: 20, textAlign: 'center', outline: 'none' }} placeholder="🎯" />
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                style={{ flex: 1, borderRadius: 12, border: '1px solid #E9ECF0', background: '#F7F8FA', padding: '12px 16px', fontSize: 14, outline: 'none' }} placeholder="Goal name" />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 4 }}>Target ₹</label>
                <input type="number" value={form.targetAmount} onChange={(e) => setForm((p) => ({ ...p, targetAmount: e.target.value }))}
                  style={{ width: '100%', borderRadius: 12, border: '1px solid #E9ECF0', background: '#F7F8FA', padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} placeholder="100000" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 4 }}>Saved so far ₹</label>
                <input type="number" value={form.savedAmount} onChange={(e) => setForm((p) => ({ ...p, savedAmount: e.target.value }))}
                  style={{ width: '100%', borderRadius: 12, border: '1px solid #E9ECF0', background: '#F7F8FA', padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} placeholder="0" />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 10, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 4 }}>Deadline (optional)</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                style={{ width: '100%', borderRadius: 12, border: '1px solid #E9ECF0', background: '#F7F8FA', padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ fontSize: 10, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 8 }}>Color</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {COLORS.map((c) => (
                  <button key={c.key} onClick={() => setForm((p) => ({ ...p, color: c.key }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c.bg, border: form.color === c.key ? '3px solid #0A0D14' : '3px solid transparent', cursor: 'pointer', outline: 'none' }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #E9ECF0', color: '#374151', fontSize: 14, fontWeight: 600, background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={!form.name.trim() || !form.targetAmount || createGoal.isPending || updateGoal.isPending}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#00C2B2', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: !form.name.trim() || !form.targetAmount ? 0.5 : 1 }}>
                {createGoal.isPending || updateGoal.isPending ? 'Saving…' : editId ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Savings Tab ────────────────────────────────────────────────────
function SavingsTab() {
  const { data: goal, isLoading } = useSavingsGoal();
  const upsert = useUpsertSavingsGoal();

  const [income,  setIncome]  = useState('');
  const [savings, setSavings] = useState('');
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    if (goal) {
      setIncome(Number(goal.monthlyIncome) > 0 ? String(Number(goal.monthlyIncome)) : '');
      setSavings(String(Number(goal.monthlySavings)));
    }
  }, [goal]);

  const maxSpend = income && savings ? Number(income) - Number(savings) : null;

  function handleSave() {
    const s = Number(savings);
    if (!s || s <= 0) return;
    upsert.mutate({ monthlyIncome: Number(income) || 0, monthlySavings: s }, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); },
    });
  }

  if (isLoading) return <p style={{ textAlign: 'center', color: '#B0B8C4', padding: '40px 0' }}>Loading…</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Current summary */}
      {goal && (
        <div style={{ background: 'linear-gradient(135deg, #0F1624 0%, #0B2A28 100%)', borderRadius: 20, padding: '18px 20px', color: '#fff' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Monthly Plan</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Income</p>
              <p style={{ fontSize: 16, fontWeight: 800 }}>{fmt(goal.monthlyIncome)}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Save</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#34D399' }}>{fmt(goal.monthlySavings)}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Max Spend</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#FCD34D' }}>{fmt(Number(goal.monthlyIncome) - Number(goal.monthlySavings))}</p>
            </div>
          </div>
        </div>
      )}

      <SurfaceCard>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14', marginBottom: 14 }}>
          {goal ? 'Update savings plan' : 'Set up your savings plan'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 6 }}>Monthly Income ₹ (optional)</label>
            <input type="number" inputMode="decimal" placeholder="e.g. 60000" value={income} onChange={(e) => setIncome(e.target.value)}
              style={{ width: '100%', border: '1.5px solid #E9ECF0', borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#F7F8FA' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 6 }}>Monthly Savings Target ₹ *</label>
            <input type="number" inputMode="decimal" placeholder="e.g. 15000" value={savings} onChange={(e) => setSavings(e.target.value)}
              style={{ width: '100%', border: '1.5px solid #E9ECF0', borderRadius: 12, padding: '11px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#F7F8FA' }} />
          </div>

          {maxSpend !== null && (
            <div style={{ background: '#E6FAF9', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#374151' }}>Max monthly spend</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#00C2B2' }}>{fmt(maxSpend)}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!savings || Number(savings) <= 0 || upsert.isPending}
            style={{
              width: '100%', padding: '12px', borderRadius: 12, border: 'none',
              background: saved ? '#10B981' : 'linear-gradient(135deg, #00C2B2 0%, #009E90 100%)',
              color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              opacity: !savings || Number(savings) <= 0 ? 0.5 : 1,
              transition: 'background 0.3s',
            }}
          >
            {saved ? '✓ Saved!' : upsert.isPending ? 'Saving…' : goal ? 'Update Plan' : 'Set Plan'}
          </button>
        </div>
      </SurfaceCard>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function PlanningPage() {
  const navigate   = useNavigate();
  const [tab, setTab] = useState('Budgets');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title="Plan" onBack={() => navigate(-1)} />

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
              {t === 'Budgets' ? '🎯 Budgets' : t === 'Goals' ? '🏆 Goals' : '🐷 Savings'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '14px 16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'Budgets' && <BudgetsTab />}
        {tab === 'Goals'   && <GoalsTab />}
        {tab === 'Savings' && <SavingsTab />}
      </div>
    </div>
  );
}
