import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import Button from '../../components/ui/Button';
import { useBalances, usePaidForSummary, useRequestPayment, useAcceptPayment, useRejectPayment, useWaiveSplit, useMarkReceived } from '../../hooks/useSplits';
import { useBulkPayments, useCreateBulkPayment, useRespondBulkPayment, useCancelBulkPayment } from '../../hooks/useBulkPayments';
import { useGroups } from '../../hooks/useGroups';
import { useCardDelegationBalance } from '../../hooks/useCardDelegation';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? format(new Date(d), 'd MMM') : '');

/* ─── Status badge ─── */
function StatusBadge({ status }) {
  if (status === 'PENDING')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Pending</span>;
  if (status === 'PAYMENT_REQUESTED')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Claimed paid</span>;
  return null;
}

/* ─── Single split row ─── */
function SplitRow({ split, mode, onAccept, onReject, onPay, onWaive, onMarkReceived, isBusy, isInBulk }) {
  const [confirmWaive, setConfirmWaive] = useState(false);
  const title = split.expense?.title || 'Expense';
  const amount = Number(split.amount);

  return (
    <div className={`px-4 py-3 border-t border-gray-50 dark:border-gray-700 flex flex-col gap-2 ${isInBulk ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{title}</p>
          <p className="text-xs text-gray-400">{fmtDate(split.expense?.expenseDate)}</p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(amount)}</span>
          <StatusBadge status={split.status} />
        </div>
      </div>

      {mode === 'owed' && split.status === 'PAYMENT_REQUESTED' && (
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1 !min-h-[36px] text-xs" onClick={() => onAccept(split.id)} disabled={isBusy}>
            Accept ✓
          </Button>
          <Button variant="danger" className="flex-1 !min-h-[36px] text-xs" onClick={() => onReject(split.id)} disabled={isBusy}>
            Reject ✗
          </Button>
        </div>
      )}

      {mode === 'owed' && split.status === 'PENDING' && (
        <Button variant="outline" className="w-full !min-h-[36px] text-xs !border-green-400 !text-green-600" onClick={() => onMarkReceived(split.id)} disabled={isBusy}>
          Mark as received ✓
        </Button>
      )}

      {mode === 'owed' && !confirmWaive && (
        <button
          className="text-xs text-gray-300 text-right w-full hover:text-gray-400 transition-colors"
          onClick={() => setConfirmWaive(true)}
        >
          Wave off
        </button>
      )}

      {mode === 'owed' && confirmWaive && (
        <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl px-3 py-2">
          <p className="text-xs text-orange-700 flex-1">Forgive {fmt(amount)}? It stays in your expenses.</p>
          <button
            className="text-xs font-semibold text-orange-600 px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-700 disabled:opacity-50"
            onClick={() => { onWaive(split.id); setConfirmWaive(false); }}
            disabled={isBusy}
          >
            Yes, forgive
          </button>
          <button
            className="text-xs text-gray-400 px-2 py-1"
            onClick={() => setConfirmWaive(false)}
          >
            Cancel
          </button>
        </div>
      )}

      {mode === 'iowe' && split.status === 'PENDING' && !isInBulk && (
        <Button variant="outline" className="w-full !min-h-[36px] text-xs" onClick={() => onPay(split.id)} disabled={isBusy}>
          Mark as paid
        </Button>
      )}

      {mode === 'iowe' && split.status === 'PAYMENT_REQUESTED' && (
        <p className="text-xs text-amber-600 text-center py-1">⏳ Waiting for confirmation…</p>
      )}
    </div>
  );
}

/* ─── Bulk payment sheet (select splits + note + send) ─── */
function BulkPaySheet({ group, onClose }) {
  const pendingSplits = group.splits.filter((s) => s.status === 'PENDING');
  const [selected, setSelected] = useState(new Set(pendingSplits.map((s) => s.id)));
  const [note, setNote] = useState('');
  const create = useCreateBulkPayment();

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedSplits = pendingSplits.filter((s) => selected.has(s.id));
  const total = selectedSplits.reduce((sum, s) => sum + Number(s.amount), 0);

  const submit = () => {
    if (selectedSplits.length === 0) return;
    create.mutate(
      { toUserId: group.payerUserId, splitIds: [...selected], note: note || undefined },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white dark:bg-gray-800 rounded-t-3xl px-5 pt-5 pb-10 flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-base font-bold text-red-600 shrink-0">
            {group.payerName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Pay {group.payerName} together</p>
            <p className="text-xs text-gray-400">Select expenses to bundle</p>
          </div>
        </div>

        {/* Split checkboxes */}
        <div className="flex flex-col divide-y divide-gray-50 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
          {pendingSplits.map((split) => {
            const checked = selected.has(split.id);
            return (
              <button
                key={split.id}
                className={`flex items-center gap-3 px-4 py-3 text-left transition-colors ${checked ? 'bg-primary-50 dark:bg-primary-900/30' : 'bg-white dark:bg-gray-800'}`}
                onClick={() => toggle(split.id)}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-primary-500 border-primary-500' : 'border-gray-300'}`}>
                  {checked && <span className="text-white text-xs leading-none">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{split.expense?.title || 'Expense'}</p>
                  <p className="text-xs text-gray-400">{fmtDate(split.expense?.expenseDate)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 shrink-0">{fmt(split.amount)}</span>
              </button>
            );
          })}
        </div>

        {/* Note */}
        <div className="relative">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-primary-400"
          />
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-500">{selectedSplits.length} expense{selectedSplits.length !== 1 ? 's' : ''} selected</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(total)}</p>
        </div>

        {/* Submit */}
        <button
          onClick={submit}
          disabled={create.isPending || selectedSplits.length === 0}
          className="w-full py-3.5 rounded-2xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {create.isPending ? 'Sending…' : `Send Payment Request · ${fmt(total)}`}
        </button>
      </div>
    </div>
  );
}

/* ─── Incoming bulk payment card (for Owed to me tab) ─── */
function IncomingBulkCard({ bp, onAccept, onReject, isBusy }) {
  const [expanded, setExpanded] = useState(false);
  const total = Number(bp.totalAmount);
  const count = bp.splits.length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-primary-100 dark:border-primary-700">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-600 shrink-0">
          {bp.fromUser.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{bp.fromUser.name} wants to pay you</p>
          <p className="text-xs text-gray-400">{count} expense{count !== 1 ? 's' : ''} · {fmt(total)}</p>
        </div>
        <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full font-medium">💸 Bulk</span>
      </div>

      {/* Note */}
      {bp.note && (
        <p className="text-xs text-gray-400 italic px-4 pb-2">"{bp.note}"</p>
      )}

      {/* Expand toggle */}
      <button
        className="w-full text-xs text-gray-400 px-4 pb-2 text-left flex items-center gap-1"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? '▲ Hide' : '▼ Show'} expenses
      </button>

      {expanded && (
        <div className="border-t border-gray-50 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
          {bp.splits.map((s) => (
            <div key={s.splitId} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-xs text-gray-700 dark:text-gray-200">{s.split.expense?.title || 'Expense'}</p>
                <p className="text-xs text-gray-400">{fmtDate(s.split.expense?.expenseDate)}</p>
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{fmt(s.split.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4 pt-2">
        <Button variant="primary" className="flex-1 !min-h-[40px] text-sm" onClick={() => onAccept(bp.id)} disabled={isBusy}>
          Accept ✓
        </Button>
        <Button variant="danger" className="flex-1 !min-h-[40px] text-sm" onClick={() => onReject(bp.id)} disabled={isBusy}>
          Reject ✗
        </Button>
      </div>
    </div>
  );
}

/* ─── Sent bulk payment (shown inside iOwe group) ─── */
function SentBulkBanner({ bp, onCancel, isBusy }) {
  const [expanded, setExpanded] = useState(false);
  const total = Number(bp.totalAmount);
  const count = bp.splits.length;

  return (
    <div className="mx-4 mb-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-amber-800">⏳ Bulk payment pending</p>
          <p className="text-xs text-amber-600">{count} expense{count !== 1 ? 's' : ''} · {fmt(total)}</p>
        </div>
        <button
          onClick={() => onCancel(bp.id)}
          disabled={isBusy}
          className="text-xs text-red-500 font-medium px-2.5 py-1.5 rounded-lg border border-red-100 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      <button className="text-xs text-amber-500 mt-1" onClick={() => setExpanded((v) => !v)}>
        {expanded ? '▲ hide' : '▼ view expenses'}
      </button>
      {expanded && bp.splits.map((s) => (
        <p key={s.splitId} className="text-xs text-amber-700 mt-1">
          {s.split.expense?.title || 'Expense'} · {fmt(s.split.amount)}
        </p>
      ))}
    </div>
  );
}

/* ─── PersonCard for "Owed to me" ─── */
function OwedPersonCard({ group, onAccept, onReject, onWaive, onMarkReceived, isBusy }) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center px-4 py-3 gap-3">
        <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => setExpanded((v) => !v)}>
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-base font-bold text-primary-600 shrink-0">
            {group.personName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{group.personName}</p>
            <p className="text-xs text-gray-400">
              {group.splits.length} {group.splits.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-green-600">{fmt(group.total)}</p>
            <p className="text-xs text-gray-400">owes you</p>
          </div>
          <span className="text-gray-300 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
        </button>
        <button
          onClick={() => navigate(`/balances/history/${group.personId}`)}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 active:bg-gray-200 dark:active:bg-gray-600"
          title="Balance history"
        >
          📈
        </button>
      </div>

      {expanded &&
        group.splits.map((split) => (
          <SplitRow key={split.id} split={split} mode="owed" onAccept={onAccept} onReject={onReject} onWaive={onWaive} onMarkReceived={onMarkReceived} isBusy={isBusy} />
        ))}
    </div>
  );
}

/* ─── PersonCard for "I owe" ─── */
function IOwePersonCard({ group, sentBulkPayments, onPay, onBulkPay, onCancelBulk, isBusy }) {
  const [expanded, setExpanded] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);

  const pendingBulk = sentBulkPayments.filter(
    (bp) => bp.toUserId === group.payerUserId && bp.status === 'PENDING'
  );
  const bulkSplitIds = new Set(pendingBulk.flatMap((bp) => bp.splits.map((s) => s.splitId)));

  const pendingSplitsCount = group.splits.filter((s) => s.status === 'PENDING' && !bulkSplitIds.has(s.id)).length;
  const hasPendingBulk = pendingBulk.length > 0;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <button className="w-full flex items-center px-4 py-3 gap-3 text-left" onClick={() => setExpanded((v) => !v)}>
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-base font-bold text-red-500 shrink-0">
            {group.payerName?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{group.payerName}</p>
            <p className="text-xs text-gray-400">
              {group.splits.length} {group.splits.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-red-500">{fmt(group.total)}</p>
            <p className="text-xs text-gray-400">you owe</p>
          </div>
          <span className="text-gray-300 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
        </button>

        {/* Pending bulk banners */}
        {expanded && pendingBulk.map((bp) => (
          <SentBulkBanner key={bp.id} bp={bp} onCancel={onCancelBulk} isBusy={isBusy} />
        ))}

        {/* Individual splits */}
        {expanded &&
          group.splits.map((split) => (
            <SplitRow
              key={split.id}
              split={split}
              mode="iowe"
              onPay={onPay}
              isBusy={isBusy}
              isInBulk={bulkSplitIds.has(split.id)}
            />
          ))}

        {/* Pay together + UPI buttons */}
        {expanded && pendingSplitsCount >= 1 && !hasPendingBulk && (
          <div className="px-4 py-3 border-t border-gray-50 dark:border-gray-700 flex gap-2">
            <button
              onClick={() => setBulkOpen(true)}
              className="flex-1 py-2.5 rounded-xl border-2 border-primary-400 text-primary-600 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              💸 Pay together
            </button>
            {group.payerEmail && (
              <a
                href={`upi://pay?pa=${encodeURIComponent(group.payerEmail)}&pn=${encodeURIComponent(group.payerName || '')}&am=${group.total}&cu=INR`}
                className="px-4 py-2.5 rounded-xl border-2 border-green-400 text-green-600 text-sm font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
              >
                Pay via UPI
              </a>
            )}
          </div>
        )}
      </div>

      {bulkOpen && <BulkPaySheet group={group} onClose={() => setBulkOpen(false)} />}
    </>
  );
}

/* ─── Paid for others card ─── */
function PaidForPersonCard({ person }) {
  const navigate = useNavigate();
  const hasOutstanding = person.totalOutstanding > 0;

  return (
    <button
      className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 text-left"
      onClick={() => navigate(`/balances/person/${person.personId}`)}
    >
      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-base font-bold text-amber-600 shrink-0">
        {person.personName?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{person.personName}</p>
        <p className="text-xs text-gray-400">{person.expenseCount} {person.expenseCount === 1 ? 'expense' : 'expenses'}</p>
      </div>
      <div className="text-right">
        {hasOutstanding ? (
          <>
            <p className="text-base font-bold text-amber-600">{fmt(person.totalOutstanding)}</p>
            <p className="text-xs text-gray-400">outstanding</p>
          </>
        ) : (
          <>
            <p className="text-base font-bold text-green-600">✓ Settled</p>
            <p className="text-xs text-gray-400">{fmt(person.totalSettled)}</p>
          </>
        )}
      </div>
      <span className="text-gray-300 text-xs ml-1">›</span>
    </button>
  );
}

/* ─── Group balance card ─── */
function GroupBalanceCard({ group, mode }) {
  const navigate = useNavigate();
  const amount = Math.abs(group.myNet);

  return (
    <button
      className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 text-left border border-indigo-100 dark:border-indigo-700 active:bg-indigo-50 transition-colors"
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-xl shrink-0">
        {group.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{group.name}</p>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 shrink-0">
            👥 Group
          </span>
        </div>
        <p className="text-xs text-gray-400">{group.memberCount} members · tap to settle up</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-base font-bold ${mode === 'owed' ? 'text-green-600' : 'text-red-500'}`}>
          {fmt(amount)}
        </p>
        <p className="text-xs text-gray-400">{mode === 'owed' ? 'owed to you' : 'you owe'}</p>
      </div>
      <span className="text-gray-300 text-xs ml-1">›</span>
    </button>
  );
}

/* ─── Main page ─── */
export default function BalancesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('owed');
  const { data, isLoading } = useBalances();
  const { data: paidFor = [], isLoading: paidForLoading } = usePaidForSummary();
  const { data: bulkData } = useBulkPayments();
  const { data: groups = [] } = useGroups();
  const { data: cardBalance } = useCardDelegationBalance();
  const cardIOwe    = cardBalance?.iOwe    || [];
  const cardOwedMe  = cardBalance?.owedToMe || [];

  const groupsOwedToMe = groups.filter((g) => g.myNet > 0.01);
  const groupsIOwe = groups.filter((g) => g.myNet < -0.01);

  const pay = useRequestPayment();
  const accept = useAcceptPayment();
  const reject = useRejectPayment();
  const waive = useWaiveSplit();
  const markReceived = useMarkReceived();
  const respondBulk = useRespondBulkPayment();
  const cancelBulk = useCancelBulkPayment();

  const isBusy = pay.isPending || accept.isPending || reject.isPending || waive.isPending || markReceived.isPending || respondBulk.isPending || cancelBulk.isPending;

  const sentBulkPayments = bulkData?.sent || [];
  const receivedBulkPayments = (bulkData?.received || []).filter((bp) => bp.status === 'PENDING');

  const owedCount = (data?.owedToMe?.reduce((s, g) => s + g.splits.length, 0) || 0) + groupsOwedToMe.length;
  const iOweCount = (data?.iOwe?.reduce((s, g) => s + g.splits.length, 0) || 0) + groupsIOwe.length;
  const paidForCount = paidFor.filter((p) => p.totalOutstanding > 0).length;
  const incomingBulkCount = receivedBulkPayments.length;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="Balances" />

      <div className="flex bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <button
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            tab === 'owed' ? 'text-primary-600 border-primary-500' : 'text-gray-400 dark:text-gray-500 border-transparent'
          }`}
          onClick={() => setTab('owed')}
        >
          Owed to me
          {(owedCount + incomingBulkCount) > 0 && (
            <span className="bg-primary-100 text-primary-600 text-xs rounded-full px-1.5 py-0.5 leading-none">
              {owedCount + incomingBulkCount}
            </span>
          )}
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            tab === 'iowe' ? 'text-red-500 border-red-400' : 'text-gray-400 dark:text-gray-500 border-transparent'
          }`}
          onClick={() => setTab('iowe')}
        >
          I owe
          {iOweCount > 0 && (
            <span className="bg-red-100 text-red-500 text-xs rounded-full px-1.5 py-0.5 leading-none">
              {iOweCount}
            </span>
          )}
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            tab === 'paidfor' ? 'text-amber-600 border-amber-500' : 'text-gray-400 dark:text-gray-500 border-transparent'
          }`}
          onClick={() => setTab('paidfor')}
        >
          Paid for
          {paidForCount > 0 && (
            <span className="bg-amber-100 text-amber-600 text-xs rounded-full px-1.5 py-0.5 leading-none">
              {paidForCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 p-4 pb-28 flex flex-col gap-3">
        {(isLoading || paidForLoading) && (
          <p className="text-center text-sm text-gray-400 mt-12">Loading…</p>
        )}

        {/* ── Owed to me ── */}
        {!isLoading && tab === 'owed' && (
          <>
            {/* Incoming bulk payment requests at the top */}
            {receivedBulkPayments.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
                  Bulk payment requests ({receivedBulkPayments.length})
                </p>
                {receivedBulkPayments.map((bp) => (
                  <IncomingBulkCard
                    key={bp.id}
                    bp={bp}
                    onAccept={(id) => respondBulk.mutate({ id, action: 'ACCEPTED' })}
                    onReject={(id) => respondBulk.mutate({ id, action: 'REJECTED' })}
                    isBusy={isBusy}
                  />
                ))}
              </div>
            )}

            {/* Regular splits */}
            {data?.owedToMe?.length === 0 && receivedBulkPayments.length === 0 && groupsOwedToMe.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-16 gap-3">
                <span className="text-5xl">🎉</span>
                <p className="text-sm text-gray-400">No one owes you right now</p>
              </div>
            ) : (
              <>
                {data?.owedToMe?.map((group) => (
                  <OwedPersonCard
                    key={group.personId}
                    group={group}
                    onAccept={(id) => accept.mutate(id)}
                    onReject={(id) => reject.mutate(id)}
                    onWaive={(id) => waive.mutate(id)}
                    onMarkReceived={(id) => markReceived.mutate(id)}
                    isBusy={isBusy}
                  />
                ))}
                {groupsOwedToMe.length > 0 && (
                  <>
                    {data?.owedToMe?.length > 0 && (
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pt-2">
                        From groups
                      </p>
                    )}
                    {groupsOwedToMe.map((g) => (
                      <GroupBalanceCard key={g.id} group={g} mode="owed" />
                    ))}
                  </>
                )}
                {cardOwedMe.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pt-2">
                      Card debts owed to you
                    </p>
                    {cardOwedMe.map((c) => (
                      <button
                        key={c.delegationId}
                        onClick={() => navigate('/settings/card-delegations')}
                        className="w-full bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3 text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xl shrink-0">
                          {c.card.icon || '💳'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.person.name || c.person.email}</p>
                          <p className="text-xs text-gray-400">{c.card.name}</p>
                          {c.pendingApproval > 0 && (
                            <p className="text-xs text-amber-600">{fmt(c.pendingApproval)} awaiting your approval</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-green-600">{fmt(c.outstanding)}</p>
                          <p className="text-xs text-gray-400">owed to you</p>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ── I owe ── */}
        {!isLoading && tab === 'iowe' && (
          data?.iOwe?.length === 0 && groupsIOwe.length === 0 && cardIOwe.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-16 gap-3">
              <span className="text-5xl">✅</span>
              <p className="text-sm text-gray-400">You don't owe anyone right now</p>
            </div>
          ) : (
            <>
              {data?.iOwe?.map((group) => (
                <IOwePersonCard
                  key={group.payerUserId}
                  group={group}
                  sentBulkPayments={sentBulkPayments}
                  onPay={(id) => pay.mutate({ splitId: id })}
                  onBulkPay={() => {}}
                  onCancelBulk={(id) => cancelBulk.mutate(id)}
                  isBusy={isBusy}
                />
              ))}
              {groupsIOwe.length > 0 && (
                <>
                  {data?.iOwe?.length > 0 && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pt-2">
                      From groups
                    </p>
                  )}
                  {groupsIOwe.map((g) => (
                    <GroupBalanceCard key={g.id} group={g} mode="iowe" />
                  ))}
                </>
              )}
              {cardIOwe.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pt-2">
                    Card debts
                  </p>
                  {cardIOwe.map((c) => (
                    <button
                      key={c.delegationId}
                      onClick={() => navigate('/settings/card-delegations')}
                      className="w-full bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-xl shrink-0">
                        {c.card.icon || '🏦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.person.name || c.person.email}</p>
                        <p className="text-xs text-gray-400">{c.card.name}</p>
                        {c.pendingApproval > 0 && (
                          <p className="text-xs text-amber-600">{fmt(c.pendingApproval)} pending confirmation</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-red-500">{fmt(c.outstanding)}</p>
                        <p className="text-xs text-gray-400">to repay</p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )
        )}

        {/* ── Paid for ── */}
        {!paidForLoading && tab === 'paidfor' && (
          paidFor.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-16 gap-3">
              <span className="text-5xl">🧾</span>
              <p className="text-sm text-gray-400">No expenses paid for others yet</p>
              <p className="text-xs text-gray-400">When you add an expense "for someone else" it appears here</p>
            </div>
          ) : (
            paidFor.map((person) => (
              <PaidForPersonCard key={person.personId} person={person} />
            ))
          )
        )}
      </div>

      <BottomNav />
    </div>
  );
}
