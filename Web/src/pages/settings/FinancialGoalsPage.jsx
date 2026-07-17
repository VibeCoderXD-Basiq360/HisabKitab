import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import ProgressBar from '../../components/ui/ProgressBar';
import {
  useFinancialGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useContributeGoal,
} from '../../hooks/useFinancialGoals';

const COLORS = [
  { key: 'emerald', label: 'Green',  bg: '#10B981' },
  { key: 'blue',    label: 'Blue',   bg: '#3B82F6' },
  { key: 'violet',  label: 'Purple', bg: '#8B5CF6' },
  { key: 'amber',   label: 'Amber',  bg: '#F59E0B' },
  { key: 'rose',    label: 'Rose',   bg: '#F43F5E' },
  { key: 'cyan',    label: 'Cyan',   bg: '#06B6D4' },
];

const colorHex = {
  emerald: '#10B981', blue: '#3B82F6', violet: '#8B5CF6',
  amber: '#F59E0B',   rose: '#F43F5E', cyan: '#06B6D4',
};

const emptyForm = { name: '', emoji: '', targetAmount: '', savedAmount: '', deadline: '', color: 'emerald' };

function daysLeft(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86_400_000);
  return diff;
}

function deadlineBadge(dl, isCompleted) {
  if (isCompleted) return <Badge variant="success" label="Completed" />;
  if (dl === null) return null;
  if (dl < 0) return <Badge variant="overdue" label={`${Math.abs(dl)}d overdue`} />;
  if (dl === 0) return <Badge variant="due-today" label="Due today" />;
  if (dl <= 7) return <Badge variant="warning" label={`${dl}d left`} />;
  if (dl <= 30) return <Badge variant="awaiting" label={`${dl}d left`} />;
  return <Badge variant="on-track" label={`${dl}d left`} />;
}

/* Shared input style for the form sheets */
const inputStyle = {
  width: '100%',
  borderRadius: 12,
  border: '1.5px solid #E9ECF0',
  background: '#F8FAFB',
  color: '#0A0D14',
  padding: '12px 16px',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#B0B8C4',
  marginBottom: 6,
};

export default function FinancialGoalsPage() {
  const navigate = useNavigate();
  const { data: goals = [], isLoading } = useFinancialGoals();
  const createGoal     = useCreateGoal();
  const updateGoal     = useUpdateGoal();
  const deleteGoal     = useDeleteGoal();
  const contributeGoal = useContributeGoal();

  const [showForm, setShowForm]             = useState(false);
  const [form, setForm]                     = useState(emptyForm);
  const [editId, setEditId]                 = useState(null);
  const [confirmDelete, setConfirmDelete]   = useState(null);
  const [contributeSheet, setContributeSheet] = useState(null);
  const [contributeAmt, setContributeAmt]   = useState('');

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
    <div style={{ minHeight: '100vh', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
      <TopBar
        title="Financial Goals"
        onBack={() => navigate('/settings')}
        action={
          <button
            onClick={openCreate}
            style={{ color: '#00C2B2', fontWeight: 700, fontSize: 14, padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            + New
          </button>
        }
      />

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {isLoading && (
          <p style={{ textAlign: 'center', color: '#B0B8C4', padding: '32px 0', fontSize: 14 }}>
            Loading…
          </p>
        )}

        {!isLoading && goals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🏆</div>
            <p style={{ fontWeight: 700, color: '#0A0D14', fontSize: 16, marginBottom: 6 }}>No goals yet</p>
            <p style={{ color: '#B0B8C4', fontSize: 13, marginBottom: 20 }}>
              Set a target — Europe trip, emergency fund, new phone…
            </p>
            <button
              onClick={openCreate}
              style={{
                background: 'linear-gradient(135deg, #00C2B2, #00D896)',
                color: '#fff',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                borderRadius: 999,
                padding: '12px 28px',
                cursor: 'pointer',
              }}
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
          const accentColor = colorHex[g.color] || '#10B981';

          return (
            <SurfaceCard key={g.id} style={{ opacity: g.isCompleted ? 0.72 : 1 }}>
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{g.emoji || '🎯'}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 800, color: '#0A0D14', fontSize: 15, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {g.name}
                    </p>
                    <p style={{ color: '#B0B8C4', fontSize: 12, margin: '2px 0 0' }}>
                      Target ₹{target.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Action buttons + deadline badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {deadlineBadge(dl, g.isCompleted)}
                  <button
                    onClick={() => { setContributeSheet({ id: g.id, name: g.name }); setContributeAmt(''); }}
                    title="Add funds"
                    style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#B0B8C4', fontSize: 15, lineHeight: 1 }}
                  >
                    ➕
                  </button>
                  <button
                    onClick={() => openEdit(g)}
                    title="Edit"
                    style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#B0B8C4', fontSize: 15, lineHeight: 1 }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setConfirmDelete(g.id)}
                    title="Delete"
                    style={{ padding: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#B0B8C4', fontSize: 15, lineHeight: 1 }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Progress section */}
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ color: '#00C2B2', fontWeight: 700, fontSize: 15 }}>
                    ₹{saved.toLocaleString('en-IN')}
                  </span>
                  <span style={{ color: '#B0B8C4', fontSize: 12 }}>
                    {pct}% saved
                  </span>
                </div>
                <ProgressBar pct={pct} height={6} />
                <p style={{ color: '#B0B8C4', fontSize: 12, marginTop: 6, margin: '6px 0 0' }}>
                  {remain > 0
                    ? `₹${remain.toLocaleString('en-IN')} remaining`
                    : 'Goal reached!'}
                </p>
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      {/* FAB — Add goal */}
      {!isLoading && goals.length > 0 && (
        <button
          onClick={openCreate}
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            right: 20,
            zIndex: 30,
            background: 'linear-gradient(135deg, #00C2B2, #00D896)',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            width: 54,
            height: 54,
            fontSize: 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,194,178,0.35)',
            cursor: 'pointer',
          }}
          aria-label="New goal"
        >
          +
        </button>
      )}

      {/* Create / Edit sheet */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(10,13,20,0.45)' }}
            onClick={() => setShowForm(false)}
          />
          <div style={{
            position: 'relative',
            background: '#FFFFFF',
            borderRadius: '24px 24px 0 0',
            padding: 20,
            width: '100%',
            maxWidth: 480,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
          }}>
            <h3 style={{ fontWeight: 800, color: '#0A0D14', fontSize: 18, margin: 0 }}>
              {editId ? 'Edit Goal' : 'New Goal'}
            </h3>

            {/* Emoji + name row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inputStyle, width: 56, padding: '12px 4px', fontSize: 20, textAlign: 'center', flexShrink: 0 }}
                placeholder="🎯"
                value={form.emoji}
                onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
                maxLength={4}
              />
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="Goal name (e.g. Europe Trip)"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Target + Saved row */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Target ₹</label>
                <input
                  type="number"
                  style={inputStyle}
                  placeholder="100000"
                  value={form.targetAmount}
                  onChange={(e) => setForm((p) => ({ ...p, targetAmount: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Saved so far ₹</label>
                <input
                  type="number"
                  style={inputStyle}
                  placeholder="0"
                  value={form.savedAmount}
                  onChange={(e) => setForm((p) => ({ ...p, savedAmount: e.target.value }))}
                />
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label style={labelStyle}>Target Date (optional)</label>
              <input
                type="date"
                style={inputStyle}
                value={form.deadline}
                onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              />
            </div>

            {/* Color picker */}
            <div>
              <label style={labelStyle}>Color</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {COLORS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setForm((p) => ({ ...p, color: c.key }))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: c.bg,
                      border: form.color === c.key ? `3px solid #0A0D14` : '3px solid transparent',
                      cursor: 'pointer',
                      transform: form.color === c.key ? 'scale(1.15)' : 'scale(1)',
                      transition: 'transform 0.15s ease, border-color 0.15s ease',
                      outline: 'none',
                    }}
                    aria-label={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  flex: 1,
                  padding: '13px 0',
                  borderRadius: 14,
                  border: '1.5px solid #E9ECF0',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim() || !form.targetAmount || busy}
                style={{
                  flex: 1,
                  padding: '13px 0',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #00C2B2, #00D896)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  opacity: (!form.name.trim() || !form.targetAmount || busy) ? 0.55 : 1,
                }}
              >
                {busy ? 'Saving…' : editId ? 'Save Changes' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribute sheet */}
      {contributeSheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(10,13,20,0.45)' }}
            onClick={() => setContributeSheet(null)}
          />
          <SurfaceCard style={{ position: 'relative', width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontWeight: 800, color: '#0A0D14', fontSize: 16, margin: 0 }}>
              Add to "{contributeSheet.name}"
            </h3>
            <p style={{ color: '#B0B8C4', fontSize: 12, margin: 0 }}>Use a negative number to subtract.</p>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#B0B8C4', fontSize: 14 }}>₹</span>
              <input
                type="number"
                autoFocus
                style={{ ...inputStyle, paddingLeft: 30 }}
                placeholder="5000"
                value={contributeAmt}
                onChange={(e) => setContributeAmt(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setContributeSheet(null)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 14,
                  border: '1.5px solid #E9ECF0',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleContribute}
                disabled={!contributeAmt || contributeGoal.isPending}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #00C2B2, #00D896)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  opacity: (!contributeAmt || contributeGoal.isPending) ? 0.55 : 1,
                }}
              >
                {contributeGoal.isPending ? 'Saving…' : 'Add Funds'}
              </button>
            </div>
          </SurfaceCard>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(10,13,20,0.45)' }}
            onClick={() => setConfirmDelete(null)}
          />
          <SurfaceCard style={{ position: 'relative', width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontWeight: 800, color: '#0A0D14', fontSize: 16, margin: 0 }}>Delete Goal?</h3>
            <p style={{ color: '#B0B8C4', fontSize: 13, margin: 0 }}>All progress will be lost.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 14,
                  border: '1.5px solid #E9ECF0',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => { await deleteGoal.mutateAsync(confirmDelete); setConfirmDelete(null); }}
                disabled={deleteGoal.isPending}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  borderRadius: 14,
                  border: 'none',
                  background: '#F43F5E',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                  opacity: deleteGoal.isPending ? 0.55 : 1,
                }}
              >
                {deleteGoal.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </SurfaceCard>
        </div>
      )}
    </div>
  );
}
