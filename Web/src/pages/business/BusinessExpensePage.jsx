import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessExpenses, useCreateExpense, useDeleteExpense, useBusiness } from '../../hooks/useBusiness';
import { useAccounts } from '../../hooks/useAccounts';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';

const fmt = n => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN')}`;
const CATEGORIES = ['Materials','Rent','Utilities','Labour','Marketing','Transport','Equipment','Software','Packaging','Other'];
const CAT_ICONS = { Materials:'🧵', Rent:'🏠', Utilities:'💡', Labour:'👷', Marketing:'📢', Transport:'🚚', Equipment:'⚙️', Software:'💻', Packaging:'📦', Other:'📋' };

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default function BusinessExpensePage() {
  const navigate = useNavigate();
  const { data: business } = useBusiness();
  const { data: accounts = [] } = useAccounts();
  const locations = business?.locations || [];

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const from = new Date(year, month - 1, 1).toISOString();
  const to   = new Date(year, month, 0, 23, 59, 59).toISOString();
  const { data: expenses = [], isLoading } = useBusinessExpenses({ from, to });

  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const [sheet, setSheet] = useState(false);
  const [form, setForm] = useState({
    category: 'Materials', amount: '', date: new Date().toISOString().split('T')[0],
    vendor: '', note: '', locationId: '', accountId: '',
  });
  const [err, setErr] = useState('');
  const [delId, setDelId] = useState(null);

  const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm';

  function shift(delta) {
    let m = month + delta, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
  }

  const totalSpend = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const grouped = expenses.reduce((acc, e) => {
    const key = new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    (acc[key] = acc[key] || []).push(e);
    return acc;
  }, {});

  async function handleCreate(e) {
    e.preventDefault(); setErr('');
    try {
      await createExpense.mutateAsync({
        ...form,
        amount: Number(form.amount),
        locationId: form.locationId || undefined,
        accountId:  form.accountId  || undefined,
      });
      setSheet(false);
      setForm({ category: 'Materials', amount: '', date: new Date().toISOString().split('T')[0], vendor: '', note: '', locationId: '', accountId: '' });
    } catch (ex) { setErr(ex.response?.data?.error || 'Error'); }
  }

  async function handleDelete(id) {
    await deleteExpense.mutateAsync(id);
    setDelId(null);
  }

  const accountColor = (acc) => {
    if (!acc) return 'bg-gray-100 dark:bg-gray-700 text-gray-400';
    const colors = { SAVINGS: 'bg-blue-50 text-blue-600', CURRENT: 'bg-indigo-50 text-indigo-600',
      WALLET: 'bg-green-50 text-green-600', CASH: 'bg-yellow-50 text-yellow-700', CREDIT_CARD: 'bg-red-50 text-red-600' };
    return colors[acc.type] || 'bg-gray-50 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <TopBar title="Business Expenses" onBack={() => navigate('/business')} />

      <div className="px-4 pt-4 space-y-4">
        {/* Month picker */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm">
          <button onClick={() => shift(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 font-bold">‹</button>
          <p className="font-bold text-gray-900 dark:text-white">{MONTHS[month - 1]} {year}</p>
          <button onClick={() => shift(1)} disabled={year === now.getFullYear() && month === now.getMonth() + 1}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 font-bold disabled:opacity-40">›</button>
        </div>

        {/* Total */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex justify-between items-center">
          <p className="text-sm text-gray-400">{expenses.length} expenses this month</p>
          <p className="text-xl font-bold text-red-500">{fmt(totalSpend)}</p>
        </div>

        <button onClick={() => { setErr(''); setSheet(true); }}
          className="w-full py-3 rounded-xl bg-primary-600 text-white font-bold text-sm shadow">
          + Add Expense
        </button>

        {isLoading && <p className="text-center text-gray-400 py-10">Loading…</p>}
        {!isLoading && expenses.length === 0 && <p className="text-center text-gray-400 py-10">No expenses this month</p>}

        <div className="space-y-3">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{date}</p>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                {items.map((exp, i) => (
                  <div key={exp.id} className={`flex items-center gap-3 px-4 py-3 ${i < items.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}>
                    <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-lg shrink-0">
                      {CAT_ICONS[exp.category] || '📋'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{exp.vendor || exp.category}</p>
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full font-bold shrink-0">🏭</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs text-gray-400">{exp.category}</p>
                        {exp.location && <p className="text-xs text-gray-400">· {exp.location.name}</p>}
                        {exp.account && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${accountColor(exp.account)}`}>
                            {exp.account.icon || ''} {exp.account.name}
                          </span>
                        )}
                      </div>
                      {exp.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{exp.note}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-red-500">{fmt(exp.amount)}</p>
                      <button onClick={() => setDelId(exp.id)} className="text-xs text-gray-300 dark:text-gray-600 hover:text-red-400 mt-0.5">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add expense sheet */}
      {sheet && (
        <Sheet title="Add Business Expense" onClose={() => setSheet(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-400 mb-1 block">Category</label>
                <select className={inputCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-400 mb-1 block">Amount *</label>
                <input className={inputCls} type="number" required step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
            </div>

            <div><label className="text-xs text-gray-400 mb-1 block">Debit Account</label>
              <select className={inputCls} value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
                <option value="">-- No account (untracked) --</option>
                {accounts.filter(a => a.type !== 'CREDIT_CARD').map(a => (
                  <option key={a.id} value={a.id}>{a.icon || ''} {a.name} ({a.type}) — Bal: {fmt(a.balance)}</option>
                ))}
              </select>
              {form.accountId && <p className="text-xs text-gray-400 mt-1">💸 This amount will be deducted from the selected account balance.</p>}
            </div>

            <div><label className="text-xs text-gray-400 mb-1 block">Date *</label>
              <input className={inputCls} type="date" required value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            <div><label className="text-xs text-gray-400 mb-1 block">Vendor / Description</label>
              <input className={inputCls} value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
                placeholder="e.g. Amazon, Local supplier" />
            </div>

            {locations.length > 0 && (
              <div><label className="text-xs text-gray-400 mb-1 block">Location</label>
                <select className={inputCls} value={form.locationId} onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))}>
                  <option value="">All locations</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}

            <div><label className="text-xs text-gray-400 mb-1 block">Note (optional)</label>
              <input className={inputCls} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </div>

            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setSheet(false)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={createExpense.isPending} className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-semibold disabled:opacity-60">
                {createExpense.isPending ? 'Saving…' : 'Add Expense'}
              </button>
            </div>
          </form>
        </Sheet>
      )}

      {/* Delete confirm */}
      {delId && (
        <Sheet title="Delete expense?" onClose={() => setDelId(null)}>
          <p className="text-sm text-gray-500 dark:text-gray-400">This will also remove the account balance impact.</p>
          <div className="flex gap-3">
            <button onClick={() => setDelId(null)} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 text-sm font-semibold">Cancel</button>
            <button onClick={() => handleDelete(delId)} disabled={deleteExpense.isPending}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-60">
              {deleteExpense.isPending ? '…' : 'Delete'}
            </button>
          </div>
        </Sheet>
      )}

      <BottomNav />
    </div>
  );
}
