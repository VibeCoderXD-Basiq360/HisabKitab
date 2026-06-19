import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import {
  useGroup,
  useAddGroupExpense,
  useDeleteGroupExpense,
  useRecordSettlement,
} from '../../hooks/useGroups';
import { useRateMap } from '../../hooks/useExchangeRates';

const fmt = (n, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(n || 0));

const currencySymbol = (currency = 'INR') => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).formatToParts(0).find(p => p.type === 'currency')?.value || currency; }
  catch { return currency; }
};
const fmtDate = (d) => format(new Date(d), 'd MMM');

const TYPE_ICON = { TRIP: '✈️', HOME: '🏠', WORK: '💼', COUPLE: '💑', OTHER: '👥' };

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Member Avatars ───────────────────────────────────────────────────────────

function MemberAvatarsRow({ members, max = 5 }) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((m, i) => (
        <div
          key={m.id || i}
          className="w-8 h-8 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center text-xs font-semibold text-primary-700 flex-shrink-0"
        >
          {initials(m.name)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-gray-300 flex-shrink-0">
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

function ExpensesTab({ group, currentUser }) {
  const [search, setSearch] = useState('');
  const deleteExpense = useDeleteGroupExpense(group.id);
  const rateMap = useRateMap();
  const allExpenses = group.groupExpenses || [];
  const expenses = search.trim()
    ? allExpenses.filter((e) => e.title?.toLowerCase().includes(search.toLowerCase()))
    : allExpenses;

  const myMember = group.members?.find((m) => m.userId === currentUser?.uid);

  if (allExpenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-5xl">💸</span>
        <p className="text-base font-semibold text-gray-700">No expenses yet</p>
        <p className="text-sm text-gray-400">Add the first one!</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search expenses…"
          className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl pl-8 pr-4 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>

      {expenses.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">No results for "{search}"</p>
      )}

      {[...expenses]
        .sort((a, b) => new Date(b.expenseDate || b.createdAt) - new Date(a.expenseDate || a.createdAt))
        .map((exp) => {
          const myShare = myMember
            ? exp.shares?.find((s) => s.memberId === myMember.id)
            : null;
          const isAddedByMe = exp.addedBy?.userId === currentUser?.uid;
          const isPaidByMe = exp.paidBy?.userId === currentUser?.uid;
          return (
            <div key={exp.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-base font-bold text-primary-600 flex-shrink-0">
                {exp.title?.[0]?.toUpperCase() || '💸'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{exp.title}</p>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(exp.amount, exp.currency)}</p>
                    {exp.currency && exp.currency !== 'INR' && (exp.rateAtTime != null || rateMap[exp.currency]) && (
                      <p className="text-[10px] text-gray-400">
                        ≈ {fmt(Number(exp.amount) * (exp.rateAtTime != null ? Number(exp.rateAtTime) : rateMap[exp.currency]), 'INR')}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Paid by {exp.paidBy?.name || 'Someone'} · {fmtDate(exp.expenseDate || exp.createdAt)}
                </p>
                {exp.note && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{exp.note}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {myShare && !isPaidByMe && (
                    <span className="text-xs text-gray-400">Your share: {fmt(myShare.amount, exp.currency)}</span>
                  )}
                  {isPaidByMe && (
                    <span className="text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-300 px-1.5 py-0.5 rounded-full">You paid</span>
                  )}
                  {isAddedByMe && !isPaidByMe && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">Added by you</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteExpense.mutate(exp.id)}
                className="w-8 h-8 flex items-center justify-center text-gray-300 dark:text-gray-600 active:text-red-400 flex-shrink-0"
              >
                🗑
              </button>
            </div>
          );
        })}
    </div>
  );
}

// ─── Share Bill Button ────────────────────────────────────────────────────────

function ShareBillButton({ group }) {
  const cardRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const balances = group.balances || [];
  const gc = groupCurrencyOf(group);
  const totalSpend = (group.groupExpenses || []).reduce((s, e) => s + Number(e.amount || 0), 0);

  async function handleShare() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      const file = new File([blob], `${group.name}-bill.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${group.name} bill summary` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${group.name}-bill.png`; a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
    setSharing(false);
  }

  return (
    <>
      {/* Off-screen card captured by html2canvas */}
      <div style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none' }} aria-hidden="true">
        <div ref={cardRef} style={{ width: 360, padding: 24, background: '#fff', fontFamily: 'system-ui,sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 32 }}>{group.icon || '👥'}</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 20, color: '#111' }}>{group.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#9ca3af' }}>Total spend: {fmt(totalSpend, gc)}</p>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #f3f4f6' }}>
            {balances.map((b) => {
              const n = Number(b.net || 0);
              return (
                <div key={b.memberId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: '#1f2937' }}>{b.name}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: n > 0 ? '#16a34a' : n < 0 ? '#dc2626' : '#9ca3af' }}>
                    {n > 0 ? `Gets back ${fmt(n, gc)}` : n < 0 ? `Owes ${fmt(Math.abs(n), gc)}` : 'Settled ✓'}
                  </span>
                </div>
              );
            })}
          </div>
          <p style={{ margin: '16px 0 0', fontSize: 11, color: '#d1d5db', textAlign: 'center' }}>Generated by HisabKitab</p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleShare}
        disabled={sharing || balances.length === 0}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold text-sm border border-indigo-100 dark:border-indigo-700 active:bg-indigo-100 dark:active:bg-indigo-900/40 disabled:opacity-40"
      >
        {sharing ? '⏳ Generating image…' : '📸 Share bill as image'}
      </button>
    </>
  );
}

// ─── Balances Tab ─────────────────────────────────────────────────────────────

function groupCurrencyOf(group) {
  const expenses = group.groupExpenses || [];
  if (!expenses.length) return 'INR';
  const counts = {};
  for (const e of expenses) { const c = e.currency || 'INR'; counts[c] = (counts[c] || 0) + 1; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'INR';
}

// Weighted-average frozen rate for the dominant group currency.
// Each expense contributes its rateAtTime weighted by its amount.
// Returns null for INR groups or mixed-currency groups.
function groupFrozenRate(group, rateMap) {
  const gc = groupCurrencyOf(group);
  if (gc === 'INR') return null;
  const expenses = (group.groupExpenses || []).filter((e) => (e.currency || 'INR') === gc);
  if (!expenses.length) return rateMap[gc] || null;
  const totalAmt = expenses.reduce((s, e) => s + Number(e.amount), 0);
  if (!totalAmt) return rateMap[gc] || null;
  const totalInr = expenses.reduce((s, e) => {
    const rate = e.rateAtTime != null ? Number(e.rateAtTime) : (rateMap[gc] || 0);
    return s + Number(e.amount) * rate;
  }, 0);
  return totalInr / totalAmt;
}

function BalancesTab({ group, currentUser }) {
  const { t } = useTranslation();
  const balances = group.balances || [];
  const gc = groupCurrencyOf(group);
  const rateMap = useRateMap();
  const gcRate = groupFrozenRate(group, rateMap);
  const totalSpend = (group.groupExpenses || []).reduce(
    (s, e) => s + Number(e.amount || 0),
    0
  );
  const hasMixedCurrency = new Set((group.groupExpenses || []).map(e => e.currency || 'INR')).size > 1;

  return (
    <div className="px-4 py-3 space-y-3">
      {hasMixedCurrency && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-2.5">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">⚠️ Mixed currencies — balances are summed as-is without conversion</p>
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">Total group spend</p>
        <p className="text-base font-bold text-gray-900 dark:text-white">{fmt(totalSpend, gc)}</p>
      </div>

      {balances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <span className="text-4xl">⚖️</span>
          <p className="text-sm text-gray-400">No balance data yet</p>
        </div>
      ) : (
        balances.map((b) => {
          const n = Number(b.net || 0);
          const isMe = b.userId === currentUser?.uid;
          const bg =
            n > 0 ? 'bg-green-100' : n < 0 ? 'bg-red-100' : 'bg-gray-100';
          const textColor =
            n > 0 ? 'text-green-700' : n < 0 ? 'text-red-600' : 'text-gray-500';
          return (
            <div
              key={b.memberId}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-3"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${bg} ${textColor}`}
              >
                {initials(b.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{b.name}</p>
                  {isMe && (
                    <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                      You
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {n > 0 ? (
                  <>
                    <p className="text-sm font-semibold text-green-600">Gets back {fmt(n, gc)}</p>
                    {gcRate && <p className="text-[10px] text-gray-400">≈ {fmt(n * gcRate, 'INR')}</p>}
                  </>
                ) : n < 0 ? (
                  <>
                    <p className="text-sm font-semibold text-red-500">Owes {fmt(Math.abs(n), gc)}</p>
                    {gcRate && <p className="text-[10px] text-gray-400">≈ {fmt(Math.abs(n) * gcRate, 'INR')}</p>}
                  </>
                ) : (
                  <span className="text-sm text-gray-400">{t('balance.settled')}</span>
                )}
              </div>
            </div>
          );
        })
      )}
      <ShareBillButton group={group} />
    </div>
  );
}

// ─── Settle Up Tab ────────────────────────────────────────────────────────────

function SettleUpTab({ group }) {
  const { t } = useTranslation();
  const [confirmTx, setConfirmTx] = useState(null);
  const recordSettlement = useRecordSettlement(group.id);
  const plan = group.settlePlan || [];
  const gc = groupCurrencyOf(group);
  const rateMap = useRateMap();
  const gcRate = groupFrozenRate(group, rateMap);

  function handleConfirm() {
    if (!confirmTx) return;
    recordSettlement.mutate(
      {
        fromMemberId: confirmTx.fromMemberId,
        toMemberId: confirmTx.toMemberId,
        amount: confirmTx.amount,
      },
      {
        onSuccess: () => setConfirmTx(null),
      }
    );
  }

  if (plan.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-5xl">🎉</span>
        <p className="text-base font-semibold text-gray-700">All settled up!</p>
        <p className="text-sm text-gray-400">No payments needed.</p>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-3 space-y-3">
        {plan.map((tx, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{tx.fromName}</span>
                <span className="text-gray-400 text-sm">→</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{tx.toName}</span>
              </div>
              <p className="text-base font-bold text-primary-600 mt-0.5">{fmt(tx.amount, gc)}</p>
              {gcRate && <p className="text-[10px] text-gray-400 mt-0.5">≈ {fmt(tx.amount * gcRate, 'INR')}</p>}
            </div>
            <button
              onClick={() => setConfirmTx(tx)}
              className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold active:bg-primary-700 flex-shrink-0"
            >
              Settle
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation bottom sheet */}
      {confirmTx && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setConfirmTx(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-white dark:bg-gray-800 rounded-t-3xl p-6 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-5" />
            <p className="text-base font-semibold text-gray-900 dark:text-white text-center mb-2">
              Record settlement?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              Record that{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">{confirmTx.fromName}</span> paid{' '}
              <span className="font-semibold text-gray-800 dark:text-gray-200">{confirmTx.toName}</span>{' '}
              <span className="font-semibold text-primary-600">{fmt(confirmTx.amount, gc)}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTx(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={recordSettlement.isPending}
                className="flex-1 py-3 rounded-2xl bg-primary-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {recordSettlement.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Add Expense Sheet ────────────────────────────────────────────────────────

function AddExpenseSheet({ group, currentUser, onClose }) {
  const { t } = useTranslation();
  const addExpense = useAddGroupExpense(group.id);
  const members = group.members || [];

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paidByMemberId, setPaidByMemberId] = useState(() => {
    const me = members.find((m) => m.userId === currentUser?.uid);
    return me?.id || members[0]?.id || '';
  });
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'amount' | 'percent'
  const [customSplits, setCustomSplits] = useState({});
  const [note, setNote] = useState('');

  const sym = currencySymbol(currency);

  const numAmount = parseFloat(amount) || 0;
  const equalShare = members.length > 0 ? numAmount / members.length : 0;
  const totalCustom = splitMode === 'amount'
    ? members.reduce((s, m) => s + (parseFloat(customSplits[m.id]) || 0), 0)
    : members.reduce((s, m) => s + (parseFloat(customSplits[m.id]) || 0), 0);
  const percentOk = splitMode === 'percent' && Math.abs(totalCustom - 100) < 0.01;
  const amountOk = splitMode === 'amount' && Math.abs(totalCustom - numAmount) < 0.01;

  function handleSubmit() {
    if (!title.trim() || numAmount <= 0) return;
    if (splitMode === 'percent' && !percentOk) return;
    if (splitMode === 'amount' && !amountOk) return;

    const shares = splitMode === 'equal'
      ? members.map((m) => ({ memberId: m.id, amount: equalShare }))
      : splitMode === 'percent'
        ? members.map((m) => ({ memberId: m.id, amount: Math.round((parseFloat(customSplits[m.id] || 0) / 100) * numAmount * 100) / 100 }))
        : members.map((m) => ({ memberId: m.id, amount: parseFloat(customSplits[m.id] || 0) }));

    addExpense.mutate(
      {
        title: title.trim(),
        amount: numAmount,
        currency,
        expenseDate,
        paidByMemberId,
        splitType: splitMode === 'equal' ? 'EQUAL' : 'EXACT',
        note: note.trim() || undefined,
        shares,
      },
      {
        onSuccess: () => onClose(),
      }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full bg-white dark:bg-gray-800 rounded-t-3xl z-10 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 pt-4 px-5 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-gray-900 dark:text-white">{t('home.add_expense')}</p>
            <button onClick={onClose} className="text-gray-400 text-lg px-1">
              ✕
            </button>
          </div>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner at Taj"
              className="w-full bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-200 text-sm"
            />
          </div>

          {/* Amount + Currency */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
              Amount
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">
                  {sym}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full bg-gray-50 dark:bg-gray-700 rounded-2xl pl-8 pr-4 py-3 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-200 text-sm"
                />
              </div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 rounded-2xl px-3 py-3 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-200 font-medium"
              >
                {['INR','THB','USD','EUR','GBP','AED','SGD','JPY','MYR','CAD','AUD'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-200 text-sm"
            />
          </div>

          {/* Paid by */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
              Paid by
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaidByMemberId(m.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    paidByMemberId === m.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-xs font-bold">
                    {initials(m.name)[0]}
                  </span>
                  {m.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Split */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">
              Split
            </label>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-3">
              {[['equal', 'Equal'], ['amount', 'By ₹'], ['percent', 'By %']].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => { setSplitMode(mode); setCustomSplits({}); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    splitMode === mode ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {splitMode === 'equal' && numAmount > 0 && (
              <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2">
                {fmt(equalShare, currency)} per person ({members.length} members)
              </p>
            )}

            {(splitMode === 'amount' || splitMode === 'percent') && (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-20 truncate">{m.name.split(' ')[0]}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        {splitMode === 'percent' ? '%' : sym}
                      </span>
                      <input
                        type="number"
                        value={customSplits[m.id] || ''}
                        onChange={(e) => setCustomSplits((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl pl-7 pr-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-200"
                      />
                    </div>
                    {splitMode === 'percent' && customSplits[m.id] && numAmount > 0 && (
                      <span className="text-xs text-gray-400 w-16 text-right shrink-0">
                        {fmt((parseFloat(customSplits[m.id]) / 100) * numAmount, currency)}
                      </span>
                    )}
                  </div>
                ))}
                <div className={`text-xs text-right px-1 ${
                  splitMode === 'percent'
                    ? percentOk ? 'text-green-500' : 'text-red-400'
                    : amountOk ? 'text-green-500' : 'text-red-400'
                }`}>
                  {splitMode === 'percent'
                    ? `Total: ${totalCustom.toFixed(1)}% ${percentOk ? '✓' : '(must equal 100%)'}`
                    : `Total: ${fmt(totalCustom, currency)} ${amountOk ? '✓' : `(must equal ${fmt(numAmount, currency)})`}`}
                </div>
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              className="w-full bg-gray-50 dark:bg-gray-700 rounded-2xl px-4 py-3 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-primary-200 text-sm"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || numAmount <= 0 || addExpense.isPending || (splitMode === 'percent' && !percentOk) || (splitMode === 'amount' && !amountOk)}
            className="w-full py-3.5 bg-primary-600 text-white rounded-2xl font-semibold text-base disabled:opacity-40 active:bg-primary-700 flex items-center justify-center gap-2"
          >
            {addExpense.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              t('common.add')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['Expenses', 'Balances', 'Settle Up'];

export default function GroupDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: group, isLoading } = useGroup(id);

  const [activeTab, setActiveTab] = useState(0);
  const [showAddExpense, setShowAddExpense] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <TopBar title="Group" showBack />
        <div className="flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <TopBar title="Group" showBack />
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <span className="text-4xl">😕</span>
          <p className="text-gray-500 text-sm">Group not found</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title={group.name} showBack />

      {/* Group header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center text-xl flex-shrink-0">
          {group.icon || TYPE_ICON[group.type] || '👥'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{group.name}</p>
          <p className="text-xs text-gray-400">
            {(group.members?.length || 0) === 1
              ? t('groups.member_one', { n: 1 })
              : t('groups.member_other', { n: group.members?.length || 0 })}
          </p>
        </div>
        <MemberAvatarsRow members={group.members || []} max={5} />
      </div>

      {/* Sticky tabs */}
      <div className="sticky top-[56px] z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="flex">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
                activeTab === i ? 'text-primary-600' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {tab}
              {activeTab === i && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto pb-36">
        {activeTab === 0 && (
          <ExpensesTab group={group} currentUser={user} />
        )}
        {activeTab === 1 && (
          <BalancesTab group={group} currentUser={user} />
        )}
        {activeTab === 2 && (
          <SettleUpTab group={group} />
        )}
      </div>

      {/* FAB — only show on Expenses tab */}
      {activeTab === 0 && (
        <button
          onClick={() => setShowAddExpense(true)}
          className="fixed bottom-28 right-4 z-20 w-14 h-14 bg-primary-600 text-white rounded-2xl shadow-lg flex items-center justify-center text-3xl font-light active:bg-primary-700 active:scale-95 transition-all"
          aria-label="Add expense"
        >
          +
        </button>
      )}

      {/* Add Expense Sheet */}
      {showAddExpense && (
        <AddExpenseSheet
          group={group}
          currentUser={user}
          onClose={() => setShowAddExpense(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}
