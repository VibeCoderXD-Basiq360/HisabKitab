import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import {
  useGroup,
  useAddGroupExpense,
  useDeleteGroupExpense,
  useRecordSettlement,
} from '../../hooks/useGroups';

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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
        <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

function ExpensesTab({ group, currentUser }) {
  const deleteExpense = useDeleteGroupExpense(group.id);
  const expenses = group.groupExpenses || [];

  // Find current user's GroupMember record
  const myMember = group.members?.find((m) => m.userId === currentUser?.uid);

  if (expenses.length === 0) {
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
      {[...expenses]
        .sort((a, b) => new Date(b.expenseDate || b.createdAt) - new Date(a.expenseDate || a.createdAt))
        .map((exp) => {
          const myShare = myMember
            ? exp.shares?.find((s) => s.memberId === myMember.id)
            : null;
          const isAddedByMe = exp.addedBy?.userId === currentUser?.uid;
          const isPaidByMe = exp.paidBy?.userId === currentUser?.uid;
          return (
            <div key={exp.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-base font-bold text-primary-600 flex-shrink-0">
                {exp.title?.[0]?.toUpperCase() || '💸'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">{exp.title}</p>
                  <p className="text-sm font-bold text-gray-900 flex-shrink-0">{fmt(exp.amount)}</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Paid by {exp.paidBy?.name || 'Someone'} · {fmtDate(exp.expenseDate || exp.createdAt)}
                </p>
                {exp.note && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{exp.note}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {myShare && !isPaidByMe && (
                    <span className="text-xs text-gray-400">Your share: {fmt(myShare.amount)}</span>
                  )}
                  {isPaidByMe && (
                    <span className="text-xs bg-primary-50 text-primary-600 px-1.5 py-0.5 rounded-full">You paid</span>
                  )}
                  {isAddedByMe && !isPaidByMe && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Added by you</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteExpense.mutate(exp.id)}
                className="w-8 h-8 flex items-center justify-center text-gray-300 active:text-red-400 flex-shrink-0"
              >
                🗑
              </button>
            </div>
          );
        })}
    </div>
  );
}

// ─── Balances Tab ─────────────────────────────────────────────────────────────

function BalancesTab({ group, currentUser }) {
  const balances = group.balances || [];
  const totalSpend = (group.groupExpenses || []).reduce(
    (s, e) => s + Number(e.amount || 0),
    0
  );

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">Total group spend</p>
        <p className="text-base font-bold text-gray-900">{fmt(totalSpend)}</p>
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
              className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${bg} ${textColor}`}
              >
                {initials(b.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                  {isMe && (
                    <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                      You
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {n > 0 ? (
                  <span className="text-sm font-semibold text-green-600">Gets back {fmt(n)}</span>
                ) : n < 0 ? (
                  <span className="text-sm font-semibold text-red-500">Owes {fmt(Math.abs(n))}</span>
                ) : (
                  <span className="text-sm text-gray-400">Settled up ✓</span>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Settle Up Tab ────────────────────────────────────────────────────────────

function SettleUpTab({ group }) {
  const [confirmTx, setConfirmTx] = useState(null);
  const recordSettlement = useRecordSettlement(group.id);
  const plan = group.settlePlan || [];

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
          <div key={i} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-900">{tx.fromName}</span>
                <span className="text-gray-400 text-sm">→</span>
                <span className="text-sm font-semibold text-gray-900">{tx.toName}</span>
              </div>
              <p className="text-base font-bold text-primary-600 mt-0.5">{fmt(tx.amount)}</p>
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
            className="relative w-full bg-white rounded-t-3xl p-6 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <p className="text-base font-semibold text-gray-900 text-center mb-2">
              Record settlement?
            </p>
            <p className="text-sm text-gray-500 text-center mb-6">
              Record that{' '}
              <span className="font-semibold text-gray-800">{confirmTx.fromName}</span> paid{' '}
              <span className="font-semibold text-gray-800">{confirmTx.toName}</span>{' '}
              <span className="font-semibold text-primary-600">{fmt(confirmTx.amount)}</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmTx(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm"
              >
                Cancel
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
  const addExpense = useAddGroupExpense(group.id);
  const members = group.members || [];

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paidByMemberId, setPaidByMemberId] = useState(() => {
    const me = members.find((m) => m.userId === currentUser?.uid);
    return me?.id || members[0]?.id || '';
  });
  const [splitEqual, setSplitEqual] = useState(true);
  const [customSplits, setCustomSplits] = useState({});
  const [note, setNote] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const equalShare = members.length > 0 ? numAmount / members.length : 0;

  function handleSubmit() {
    if (!title.trim() || numAmount <= 0) return;
    const shares = splitEqual
      ? members.map((m) => ({ memberId: m.id, amount: equalShare }))
      : members.map((m) => ({
          memberId: m.id,
          amount: parseFloat(customSplits[m.id] || 0),
        }));

    addExpense.mutate(
      {
        title: title.trim(),
        amount: numAmount,
        expenseDate,
        paidByMemberId,
        splitType: splitEqual ? 'EQUAL' : 'EXACT',
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
        className="relative w-full bg-white rounded-t-3xl z-10 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white pt-4 px-5 pb-3 border-b border-gray-100">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-gray-900">Add Expense</p>
            <button onClick={onClose} className="text-gray-400 text-lg px-1">
              ✕
            </button>
          </div>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner at Taj"
              className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-gray-800 outline-none focus:ring-2 focus:ring-primary-200 text-sm"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
                ₹
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full bg-gray-50 rounded-2xl pl-8 pr-4 py-3 text-gray-800 outline-none focus:ring-2 focus:ring-primary-200 text-sm"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-gray-800 outline-none focus:ring-2 focus:ring-primary-200 text-sm"
            />
          </div>

          {/* Paid by */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
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
                      : 'bg-gray-100 text-gray-600'
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
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Split
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Equal</span>
                <button
                  onClick={() => setSplitEqual((v) => !v)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    splitEqual ? 'bg-primary-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      splitEqual ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {splitEqual ? (
              numAmount > 0 && (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                  {fmt(equalShare)} per person ({members.length} members)
                </p>
              )
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-20 truncate">{m.name.split(' ')[0]}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={customSplits[m.id] || ''}
                        onChange={(e) =>
                          setCustomSplits((prev) => ({ ...prev, [m.id]: e.target.value }))
                        }
                        placeholder="0"
                        className="w-full bg-gray-50 rounded-xl pl-7 pr-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-primary-200"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note…"
              className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-gray-800 outline-none focus:ring-2 focus:ring-primary-200 text-sm"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!title.trim() || numAmount <= 0 || addExpense.isPending}
            className="w-full py-3.5 bg-primary-600 text-white rounded-2xl font-semibold text-base disabled:opacity-40 active:bg-primary-700 flex items-center justify-center gap-2"
          >
            {addExpense.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Add Expense'
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
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: group, isLoading } = useGroup(id);

  const [activeTab, setActiveTab] = useState(0);
  const [showAddExpense, setShowAddExpense] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
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
      <div className="flex flex-col min-h-screen bg-gray-50">
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
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center text-xl flex-shrink-0">
          {group.icon || TYPE_ICON[group.type] || '👥'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{group.name}</p>
          <p className="text-xs text-gray-400">{group.members?.length || 0} members</p>
        </div>
        <MemberAvatarsRow members={group.members || []} max={5} />
      </div>

      {/* Sticky tabs */}
      <div className="sticky top-[56px] z-10 bg-white border-b border-gray-100">
        <div className="flex">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${
                activeTab === i ? 'text-primary-600' : 'text-gray-400'
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
