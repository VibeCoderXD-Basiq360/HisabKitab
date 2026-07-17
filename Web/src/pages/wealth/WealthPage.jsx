import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset } from '../../hooks/useAssets';
import { useLoans } from '../../hooks/useLoans';
import { useFinancialGoals } from '../../hooks/useFinancialGoals';

const ASSET_TYPES = [
  { key: 'CASH', label: 'Cash', emoji: '💵' },
  { key: 'BANK', label: 'Bank', emoji: '🏦' },
  { key: 'INVESTMENT', label: 'Investment', emoji: '📈' },
  { key: 'PROPERTY', label: 'Property', emoji: '🏠' },
  { key: 'VEHICLE', label: 'Vehicle', emoji: '🚗' },
  { key: 'RECEIVABLE', label: 'Receivables', emoji: '🤝' },
  { key: 'OTHER', label: 'Other', emoji: '📦' },
];

const typeEmoji = { CASH: '💵', BANK: '🏦', INVESTMENT: '📈', PROPERTY: '🏠', VEHICLE: '🚗', RECEIVABLE: '🤝', OTHER: '📦' };
const emptyForm = { name: '', emoji: '', type: 'BANK', value: '', note: '' };

const fmt = (n) => '₹' + Math.abs(Number(n || 0)).toLocaleString('en-IN');

function daysLeft(deadline) {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / 86_400_000);
}

export default function WealthPage() {
  const navigate = useNavigate();
  const { data: assets = [], isLoading: aLoading } = useAssets();
  const { data: loans = [], isLoading: lLoading } = useLoans();
  const { data: goals = [] }                 = useFinancialGoals();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);

  function openCreate() { setForm(emptyForm); setEditId(null); setShowForm(true); }
  function openEdit(a) {
    setForm({ name: a.name, emoji: a.emoji || '', type: a.type, value: String(a.value), note: a.note || '' });
    setEditId(a.id); setShowForm(true);
  }
  async function handleSubmit() {
    const payload = { name: form.name.trim(), emoji: form.emoji || null, type: form.type, value: Number(form.value), note: form.note || null };
    if (editId) await updateAsset.mutateAsync({ id: editId, ...payload });
    else        await createAsset.mutateAsync(payload);
    setShowForm(false);
  }

  const isLoading = aLoading || lLoading;
  const totalAssets = assets.reduce((s, a) => s + Number(a.value || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title="Wealth" onBack={() => navigate(-1)} />

      <div style={{ flex: 1, padding: '16px 16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* ── Assets ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: -4 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Assets</p>
          <button onClick={openCreate} style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add</button>
        </div>

        {isLoading && <p style={{ color: '#B0B8C4', fontSize: 13, textAlign: 'center' }}>Loading…</p>}

        {!isLoading && assets.length === 0 && (
          <SurfaceCard>
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#B0B8C4' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>💼</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>No assets tracked</p>
              <button onClick={openCreate} style={{ marginTop: 10, padding: '8px 18px', borderRadius: 10, background: '#00C2B2', color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                Add Asset
              </button>
            </div>
          </SurfaceCard>
        )}

        {assets.length > 0 && (
          <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
            {assets.map((a, idx) => (
              <div
                key={a.id}
                onClick={() => openEdit(a)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', cursor: 'pointer',
                  borderTop: idx === 0 ? 'none' : '1px solid #F0F2F7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{a.emoji || typeEmoji[a.type] || '📦'}</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14', margin: 0 }}>{a.name}</p>
                    <p style={{ fontSize: 11, color: '#B0B8C4', margin: '2px 0 0' }}>{ASSET_TYPES.find((t) => t.key === a.type)?.label || a.type}</p>
                  </div>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#10B981' }}>{fmt(a.value)}</p>
              </div>
            ))}
          </SurfaceCard>
        )}

        {/* ── Loans ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: -4 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Loans</p>
          <button onClick={() => navigate('/loans/new')} style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add</button>
        </div>

        {loans.length === 0 && !lLoading && (
          <SurfaceCard>
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#B0B8C4' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>🏦</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>No loans tracked</p>
              <button onClick={() => navigate('/loans/new')} style={{ marginTop: 10, padding: '8px 18px', borderRadius: 10, background: '#E11D48', color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                Track Loan
              </button>
            </div>
          </SurfaceCard>
        )}

        {loans.length > 0 && (
          <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
            {loans.map((loan, idx) => {
              const paid = Number(loan.totalPaid || 0);
              const principal = Number(loan.amount || 0);
              const outstanding = Number(loan.outstanding || 0);
              const pct = principal > 0 ? Math.round((paid / principal) * 100) : 0;
              return (
                <div
                  key={loan.id}
                  onClick={() => navigate(`/loans/${loan.id}`)}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    borderTop: idx === 0 ? 'none' : '1px solid #F0F2F7',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#0A0D14', margin: 0 }}>{loan.lenderName || 'Loan'}</p>
                      <p style={{ fontSize: 11, color: '#B0B8C4', margin: '2px 0 0' }}>{pct}% repaid</p>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#E11D48', margin: 0 }}>{fmt(outstanding)}</p>
                  </div>
                  <ProgressBar pct={pct} />
                </div>
              );
            })}
          </SurfaceCard>
        )}

        {/* ── Goals ── */}
        {goals.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: -4 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Financial Goals</p>
              <button onClick={() => navigate('/plan')} style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer' }}>Manage →</button>
            </div>
            {goals.map((g) => {
              const pct = g.targetAmount > 0 ? Math.round((Number(g.savedAmount) / Number(g.targetAmount)) * 100) : 0;
              const dl  = daysLeft(g.deadline);
              return (
                <SurfaceCard key={g.id} onClick={() => navigate('/plan')}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{g.emoji || '🎯'}</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14', margin: 0 }}>{g.name}</p>
                        {dl !== null && !g.isCompleted && (
                          <p style={{ fontSize: 11, color: dl < 0 ? '#E11D48' : '#B0B8C4', margin: '2px 0 0' }}>
                            {dl < 0 ? `${Math.abs(dl)}d overdue` : `${dl}d left`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#00C2B2', margin: 0 }}>{fmt(g.savedAmount)}</p>
                      <p style={{ fontSize: 11, color: '#B0B8C4', margin: '2px 0 0' }}>{pct}% of {fmt(g.targetAmount)}</p>
                    </div>
                  </div>
                  <ProgressBar pct={Math.min(pct, 100)} />
                </SurfaceCard>
              );
            })}
          </>
        )}
      </div>

      {/* Asset form sheet */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowForm(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', width: '100%', maxWidth: 512, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontWeight: 800, fontSize: 17, color: '#0A0D14', margin: 0 }}>{editId ? 'Edit Asset' : 'Add Asset'}</p>
              {editId && (
                <button onClick={() => { deleteAsset.mutate(editId); setShowForm(false); }} style={{ fontSize: 12, color: '#E11D48', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Delete
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input value={form.emoji} onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))} maxLength={4}
                style={{ width: 56, borderRadius: 12, border: '1px solid #E9ECF0', background: '#F7F8FA', padding: '12px 8px', fontSize: 20, textAlign: 'center', outline: 'none' }} placeholder="💼" />
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                style={{ flex: 1, borderRadius: 12, border: '1px solid #E9ECF0', background: '#F7F8FA', padding: '12px 16px', fontSize: 14, outline: 'none' }} placeholder="Asset name" />
            </div>

            <div>
              <label style={{ fontSize: 10, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 8 }}>Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ASSET_TYPES.map((t) => (
                  <button key={t.key} onClick={() => setForm((p) => ({ ...p, type: t.key }))}
                    style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: '1.5px solid', cursor: 'pointer', background: form.type === t.key ? '#00C2B2' : '#F7F8FA', color: form.type === t.key ? '#fff' : '#374151', borderColor: form.type === t.key ? '#00C2B2' : '#E9ECF0' }}>
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 10, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', marginBottom: 6 }}>Value ₹</label>
              <input type="number" inputMode="decimal" value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                style={{ width: '100%', borderRadius: 12, border: '1px solid #E9ECF0', background: '#F7F8FA', padding: '11px 14px', fontSize: 16, outline: 'none', boxSizing: 'border-box' }} placeholder="0" />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #E9ECF0', color: '#374151', fontSize: 14, fontWeight: 600, background: '#fff', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={!form.name.trim() || !form.value || createAsset.isPending || updateAsset.isPending}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#00C2B2', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: !form.name.trim() || !form.value ? 0.5 : 1 }}>
                {createAsset.isPending || updateAsset.isPending ? 'Saving…' : editId ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
