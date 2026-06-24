import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useNetWorth, useCreateAsset, useUpdateAsset, useDeleteAsset } from '../../hooks/useAssets';

const ASSET_TYPES = [
  { key: 'CASH',       label: 'Cash',        emoji: '💵', color: 'emerald' },
  { key: 'BANK',       label: 'Bank',         emoji: '🏦', color: 'blue' },
  { key: 'INVESTMENT', label: 'Investment',   emoji: '📈', color: 'violet' },
  { key: 'PROPERTY',   label: 'Property',     emoji: '🏠', color: 'amber' },
  { key: 'VEHICLE',    label: 'Vehicle',      emoji: '🚗', color: 'rose' },
  { key: 'RECEIVABLE', label: 'Receivables',  emoji: '🤝', color: 'cyan' },
  { key: 'OTHER',      label: 'Other',        emoji: '📦', color: 'gray' },
];

const typeColor = {
  CASH: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  BANK: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  INVESTMENT: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  PROPERTY: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  VEHICLE: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  RECEIVABLE: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  OTHER: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  loan: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  split: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
};

const typeEmoji = { CASH: '💵', BANK: '🏦', INVESTMENT: '📈', PROPERTY: '🏠', VEHICLE: '🚗', RECEIVABLE: '🤝', OTHER: '📦', loan: '🏦', split: '🤝' };

const emptyForm = { name: '', emoji: '', type: 'BANK', value: '', note: '' };

function fmt(n) { return '₹' + Math.abs(n).toLocaleString('en-IN'); }

export default function NetWorthPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useNetWorth();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();

  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(emptyForm);
  const [editId, setEditId]         = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeTab, setActiveTab]   = useState('overview'); // 'overview' | 'assets' | 'liabilities'

  function openCreate() { setForm(emptyForm); setEditId(null); setShowForm(true); }
  function openEdit(a) {
    setForm({ name: a.name, emoji: a.emoji || '', type: a.type, value: String(a.value), note: a.note || '' });
    setEditId(a.id);
    setShowForm(true);
  }

  async function handleSubmit() {
    const payload = { name: form.name.trim(), emoji: form.emoji || null, type: form.type, value: Number(form.value), note: form.note || null };
    if (editId) await updateAsset.mutateAsync({ id: editId, ...payload });
    else        await createAsset.mutateAsync(payload);
    setShowForm(false);
  }

  const busy = createAsset.isPending || updateAsset.isPending;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
        <TopBar title="Net Worth" onBack={() => navigate(-1)} />
        <p className="text-center text-gray-400 py-16 text-sm">Loading…</p>
        <BottomNav />
      </div>
    );
  }

  const {
    assets = [], liabilities = [],
    totalAssets = 0, totalLiabilities = 0, netWorth = 0,
    assetsByType = {},
  } = data || {};

  const manualAssets = assets.filter((a) => a.type !== 'RECEIVABLE');
  const nwPositive   = netWorth >= 0;

  // Breakdown for donut-like bar
  const segments = ASSET_TYPES
    .map((t) => ({ ...t, value: assetsByType[t.key] || 0 }))
    .filter((t) => t.value > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      <TopBar
        title="Net Worth"
        onBack={() => navigate(-1)}
        action={
          <button onClick={openCreate} className="text-primary-600 dark:text-primary-400 font-semibold text-sm px-2 py-1">
            + Asset
          </button>
        }
      />

      {/* Hero card */}
      <div className={`mx-4 mt-4 rounded-3xl p-5 ${nwPositive ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
        <p className="text-emerald-100 text-xs font-semibold uppercase tracking-widest mb-1">Total Net Worth</p>
        <p className="text-white text-4xl font-bold tracking-tight">
          {netWorth < 0 ? '-' : ''}{fmt(netWorth)}
        </p>
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-emerald-100 text-xs">Assets</p>
            <p className="text-white font-bold text-lg">{fmt(totalAssets)}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div>
            <p className="text-rose-100 text-xs">Liabilities</p>
            <p className="text-white font-bold text-lg">-{fmt(totalLiabilities)}</p>
          </div>
        </div>

        {/* Stacked bar breakdown */}
        {totalAssets > 0 && (
          <div className="mt-4 w-full h-2 bg-white/20 rounded-full overflow-hidden flex">
            {segments.map((s) => (
              <div
                key={s.key}
                style={{ width: `${(s.value / totalAssets) * 100}%` }}
                className={`h-full bg-white/70`}
                title={`${s.label}: ₹${s.value.toLocaleString('en-IN')}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex mx-4 mt-4 bg-white dark:bg-gray-800 rounded-2xl p-1 gap-1 shadow-sm">
        {[['overview', 'Overview'], ['assets', 'Assets'], ['liabilities', 'Liabilities']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${activeTab === k ? 'bg-primary-600 text-white' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="px-4 mt-3 space-y-3">
        {/* OVERVIEW tab */}
        {activeTab === 'overview' && (
          <>
            {/* Asset type breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">By Asset Type</p>
              {ASSET_TYPES.filter((t) => (assetsByType[t.key] || 0) > 0).map((t) => {
                const val = assetsByType[t.key] || 0;
                const pct = totalAssets > 0 ? Math.round((val / totalAssets) * 100) : 0;
                return (
                  <div key={t.key} className="flex items-center gap-3 mb-2.5 last:mb-0">
                    <span className="text-lg w-6 text-center">{t.emoji}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t.label}</span>
                        <span className="text-gray-500">{fmt(val)} · {pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {Object.keys(assetsByType).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Add assets to see breakdown</p>
              )}
            </div>

            {/* Quick liabilities summary */}
            {liabilities.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Liabilities</p>
                {liabilities.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[l.type] || typeColor.OTHER}`}>
                        {typeEmoji[l.type]} {l.type === 'loan' ? 'Loan' : 'Splits'}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{l.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">-{fmt(l.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ASSETS tab */}
        {activeTab === 'assets' && (
          <>
            {manualAssets.length === 0 && assets.filter((a) => a.type === 'RECEIVABLE').length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">🏦</div>
                <p className="font-medium text-gray-600 dark:text-gray-300">No assets yet</p>
                <p className="text-sm mt-1">Tap "+ Asset" to add bank accounts, investments, etc.</p>
              </div>
            ) : (
              <>
                {manualAssets.map((a) => (
                  <div key={a.id} className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
                    <span className="text-2xl w-8 text-center">{a.emoji || typeEmoji[a.type] || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{a.name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${typeColor[a.type] || typeColor.OTHER}`}>
                          {ASSET_TYPES.find((t) => t.key === a.type)?.label || a.type}
                        </span>
                      </div>
                      {a.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{fmt(a.value)}</span>
                      <button onClick={() => openEdit(a)} className="p-1 text-gray-400 hover:text-primary-500">✏️</button>
                      <button onClick={() => setConfirmDelete(a.id)} className="p-1 text-gray-400 hover:text-red-500">🗑️</button>
                    </div>
                  </div>
                ))}
                {assets.filter((a) => a.type === 'RECEIVABLE').map((a) => (
                  <div key={a.id} className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🤝</span>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{a.name}</p>
                          {a.note && <p className="text-xs text-gray-400">{a.note}</p>}
                        </div>
                      </div>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400 text-sm">{fmt(a.value)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* LIABILITIES tab */}
        {activeTab === 'liabilities' && (
          <>
            {liabilities.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">✅</div>
                <p className="font-medium text-gray-600 dark:text-gray-300">No liabilities!</p>
                <p className="text-sm mt-1">No outstanding loans or split debts.</p>
              </div>
            ) : (
              liabilities.map((l) => (
                <div key={l.id} className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeEmoji[l.type]}</span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{l.name}</p>
                        {l.note && <p className="text-xs text-gray-400 mt-0.5">{l.note}</p>}
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[l.type]}`}>
                          {l.type === 'loan' ? 'Loan' : 'Split balance'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600 dark:text-red-400">-{fmt(l.value)}</p>
                      {l.type === 'loan' && (
                        <button
                          onClick={() => navigate('/loans')}
                          className="text-xs text-primary-600 dark:text-primary-400 mt-0.5"
                        >
                          Manage →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>

      {/* Add / Edit asset sheet */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-3xl p-5 w-full max-w-lg space-y-4 pb-8">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{editId ? 'Edit Asset' : 'Add Asset'}</h3>

            {/* Name + emoji */}
            <div className="flex gap-2">
              <input
                className="w-14 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-3 text-xl text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="🏦"
                value={form.emoji}
                onChange={(e) => setForm((p) => ({ ...p, emoji: e.target.value }))}
                maxLength={4}
              />
              <input
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Asset name (e.g. HDFC Savings)"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Type selector */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide font-medium block mb-2">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {ASSET_TYPES.filter((t) => t.key !== 'RECEIVABLE').map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setForm((p) => ({ ...p, type: t.key }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                      form.type === t.key
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Value */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Value ₹</label>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="150000"
                value={form.value}
                onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
              />
            </div>

            {/* Note */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Note (optional)</label>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. SBI account, ELSS fund…"
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              />
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
                disabled={!form.name.trim() || !form.value || busy}
                className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {busy ? 'Saving…' : editId ? 'Save Changes' : 'Add Asset'}
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
            <h3 className="font-bold text-gray-900 dark:text-white">Delete Asset?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">This will update your net worth calculation.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold">Cancel</button>
              <button
                onClick={async () => { await deleteAsset.mutateAsync(confirmDelete); setConfirmDelete(null); }}
                disabled={deleteAsset.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deleteAsset.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
