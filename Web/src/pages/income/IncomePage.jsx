import { useState } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useIncome, useCreateIncome, useUpdateIncome, useDeleteIncome } from '../../hooks/useIncome';
import { useAccounts } from '../../hooks/useAccounts';

const now = new Date();

const CATEGORIES = [
  { value: 'SALARY',     label: 'Salary',      icon: '💼' },
  { value: 'FREELANCE',  label: 'Freelance',   icon: '💻' },
  { value: 'RENTAL',     label: 'Rental',      icon: '🏠' },
  { value: 'BUSINESS',   label: 'Business',    icon: '🏪' },
  { value: 'INVESTMENT', label: 'Investment',  icon: '📈' },
  { value: 'GIFT',       label: 'Gift',        icon: '🎁' },
  { value: 'REFUND',     label: 'Refund',      icon: '↩️' },
  { value: 'OTHER',      label: 'Other',       icon: '💰' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

const EMPTY = { title: '', amount: '', category: 'SALARY', source: '', incomeDate: format(now, 'yyyy-MM-dd'), note: '', accountId: '' };

function IncomeForm({ initial, onSave, onClose, saving, accounts = [] }) {
  const [form, setForm] = useState(initial || EMPTY);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title || !form.amount || !form.incomeDate) return;
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-t-3xl px-5 pt-5 pb-8 flex flex-col gap-4"
      >
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-1" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {initial ? 'Edit Income' : 'Add Income'}
        </h2>

        {/* Amount */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Amount (₹)</label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            placeholder="0"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-lg font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
            required
            autoFocus
          />
        </div>

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. June Salary"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => set('category', c.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  form.category === c.value
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                }`}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Source + Date row */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Source (optional)</label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              placeholder="e.g. Infosys"
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Date</label>
            <input
              type="date"
              value={form.incomeDate}
              onChange={(e) => set('incomeDate', e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Note (optional)</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="Any note…"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {accounts.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">🏦 Add to Account <span className="font-normal text-gray-400">(optional)</span></label>
            <select
              value={form.accountId}
              onChange={(e) => set('accountId', e.target.value)}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">No account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — ₹{Number(a.balance).toLocaleString('en-IN')}</option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-bold py-3 rounded-2xl text-sm transition-colors"
        >
          {saving ? 'Saving…' : 'Save Income'}
        </button>
      </form>
    </div>
  );
}

export default function IncomePage() {
  const [viewMonth, setViewMonth] = useState(now);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null); // income object being edited

  const isCurrentMonth = isSameMonth(viewMonth, now);

  const params = {
    fromDate: startOfMonth(viewMonth).toISOString(),
    toDate:   endOfMonth(viewMonth).toISOString(),
  };

  const { data: incomes = [], isLoading } = useIncome(params);
  const create = useCreateIncome();
  const update = useUpdateIncome();
  const del    = useDeleteIncome();
  const { data: accounts = [] } = useAccounts();

  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0);

  // Group by date
  const grouped = incomes.reduce((acc, i) => {
    const key = format(new Date(i.incomeDate), 'dd MMM yyyy');
    (acc[key] = acc[key] || []).push(i);
    return acc;
  }, {});

  function handleSave(form) {
    if (editing) {
      update.mutate({ id: editing.id, ...form, amount: Number(form.amount) }, { onSuccess: closeForm });
    } else {
      create.mutate({ ...form, amount: Number(form.amount) }, { onSuccess: closeForm });
    }
  }

  function openEdit(income) {
    setEditing(income);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this income entry?')) return;
    del.mutate(id);
  }

  const saving = create.isPending || update.isPending;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="Income" showBack />

      {/* Month nav */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-between shrink-0">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl"
        >‹</button>
        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{format(viewMonth, 'MMMM yyyy')}</span>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          disabled={isCurrentMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-xl disabled:opacity-25 disabled:pointer-events-none"
        >›</button>
      </div>

      {/* Hero total */}
      <div className="mx-4 mt-4 mb-2 bg-emerald-500 rounded-2xl px-5 py-4 text-white shrink-0">
        <p className="text-xs font-medium opacity-70 mb-1">{format(viewMonth, 'MMMM yyyy')} · {incomes.length} entr{incomes.length !== 1 ? 'ies' : 'y'}</p>
        <p className="text-3xl font-bold tracking-tight">₹{totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        <p className="text-xs opacity-60 mt-1">Total income</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pb-28">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-300 dark:text-gray-600 text-sm">Loading…</div>
        ) : incomes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-6">
            <span className="text-4xl">💰</span>
            <p className="text-gray-400 dark:text-gray-500 text-sm text-center">No income recorded for {format(viewMonth, 'MMMM yyyy')}</p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl"
            >
              + Log Income
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{date}</p>
                <p className="text-xs font-semibold text-emerald-600">
                  +₹{items.reduce((s, i) => s + Number(i.amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {items.map((income) => {
                  const cat = CAT_MAP[income.category] || CAT_MAP.OTHER;
                  return (
                    <div
                      key={income.id}
                      className="flex items-center gap-3 px-4 py-3 active:bg-gray-50 dark:active:bg-gray-700"
                    >
                      <span className="text-2xl shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{income.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-emerald-600 font-medium">{cat.label}</span>
                          {income.source && <span className="text-xs text-gray-400">· {income.source}</span>}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-emerald-600 shrink-0">
                        +₹{Number(income.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => openEdit(income)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                        >✏️</button>
                        <button
                          onClick={() => handleDelete(income.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm"
                        >🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditing(null); setShowForm(true); }}
        className="fixed bottom-20 right-5 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-30 active:scale-95 transition-transform"
        aria-label="Add income"
      >
        +
      </button>

      {showForm && (
        <IncomeForm
          initial={editing ? {
            title:      editing.title,
            amount:     String(editing.amount),
            category:   editing.category,
            source:     editing.source || '',
            incomeDate: format(new Date(editing.incomeDate), 'yyyy-MM-dd'),
            note:       editing.note || '',
            accountId:  editing.accountId || '',
          } : null}
          onSave={handleSave}
          onClose={closeForm}
          saving={saving}
          accounts={accounts}
        />
      )}

      <BottomNav />
    </div>
  );
}
