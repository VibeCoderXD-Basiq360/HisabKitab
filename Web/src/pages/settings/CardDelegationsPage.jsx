import { useState } from 'react';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import {
  useCardDelegations,
  useCardDelegationBalance,
  useApproveDelegation,
  useRejectDelegation,
  useRevokeDelegation,
  useCreateRepayment,
  useApproveRepayment,
  useRejectRepayment,
  useDelegationExpenses,
} from '../../hooks/useCardDelegation';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => format(new Date(d), 'd MMM yyyy');

// ─── Expense selector sheet (for logging repayment) ──────────────────────────
function RepaySheet({ delegationId, expenses, onClose, onSubmit, isPending }) {
  const [selected, setSelected] = useState(new Set());
  const [note, setNote] = useState('');

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const total = expenses
    .filter((e) => selected.has(e.id))
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl px-4 pt-5 pb-8 flex flex-col gap-4 max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Select expenses to repay</h2>

        <div className="flex-1 overflow-y-auto flex flex-col gap-2">
          {expenses.map((e) => (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                selected.has(e.id)
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selected.has(e.id) ? 'border-primary-500 bg-primary-500' : 'border-gray-300 dark:border-gray-500'
              }`}>
                {selected.has(e.id) && <span className="text-white text-xs">✓</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{e.title || 'Expense'}</p>
                <p className="text-xs text-gray-400">{fmtDate(e.expenseDate)}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">{fmt(e.amount)}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
        />

        <button
          disabled={selected.size === 0 || isPending}
          onClick={() => onSubmit({ delegationId, expenseIds: [...selected], note })}
          className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-50"
        >
          {isPending ? 'Sending…' : `Mark ${fmt(total)} as paid`}
        </button>
      </div>
    </div>
  );
}

// ─── Owner expenses view ──────────────────────────────────────────────────────
function OwnerExpensesSheet({ delegationId, personName, onClose, onApprove, onReject, repayments, approveIsPending, rejectIsPending }) {
  const { data: expenses = [], isLoading } = useDelegationExpenses(delegationId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl px-4 pt-5 pb-8 flex flex-col gap-4 max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          {personName}'s charges on your card
        </h2>

        {repayments.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pending payment claims</p>
            {repayments.map((r) => (
              <div key={r.id} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{fmt(r.amount)}</p>
                  <p className="text-xs text-amber-600">{fmtDate(r.createdAt)}</p>
                </div>
                <button
                  onClick={() => onApprove({ delegationId, repaymentId: r.id })}
                  disabled={approveIsPending}
                  className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject({ delegationId, repaymentId: r.id })}
                  disabled={rejectIsPending}
                  className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg"
                >
                  Reject
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto flex flex-col gap-1">
          {isLoading && <p className="text-sm text-gray-400 text-center py-4">Loading…</p>}
          {!isLoading && expenses.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No expenses yet</p>
          )}
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-1 py-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{e.title || 'Expense'}</p>
                <p className="text-xs text-gray-400">{fmtDate(e.expenseDate)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(e.amount)}</p>
                {e.willRepay && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    e.isRepaid
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {e.isRepaid ? 'Repaid' : 'To repay'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CardDelegationsPage() {
  const { data, isLoading } = useCardDelegations();
  const { data: balance } = useCardDelegationBalance();
  const approveDelegation = useApproveDelegation();
  const rejectDelegation  = useRejectDelegation();
  const revokeDelegation  = useRevokeDelegation();
  const createRepayment   = useCreateRepayment();
  const approveRepayment  = useApproveRepayment();
  const rejectRepayment   = useRejectRepayment();

  const [repaySheet, setRepaySheet]         = useState(null); // { delegationId, expenses }
  const [ownerSheet, setOwnerSheet]         = useState(null); // { delegationId, personName, repayments }

  const outgoing = data?.outgoing || [];
  const incoming = data?.incoming || [];

  const handleRepay = async (payload) => {
    await createRepayment.mutateAsync(payload);
    setRepaySheet(null);
  };

  const statusBadge = (status) => {
    if (status === 'PENDING') return <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending approval</span>;
    if (status === 'ACTIVE')  return <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>;
    return <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Revoked</span>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="Shared Cards" showBack />
      <div className="flex-1 pb-24 overflow-auto">

        {/* ── Cards I use (outgoing) ── */}
        <div className="px-4 pt-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Cards I use (Dad / others pay)
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading && <p className="px-4 py-6 text-sm text-gray-400 text-center">Loading…</p>}
            {!isLoading && outgoing.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">
                No delegations yet — go to Payment Types to link a credit card
              </p>
            )}
            {outgoing.map((d) => {
              const balItem = balance?.iOwe?.find((b) => b.delegationId === d.id);
              const outstanding = balItem?.outstanding || 0;
              const pendingApproval = balItem?.pendingApproval || 0;
              const pendingExpenses = balItem?.expenses || [];

              return (
                <div key={d.id} className="px-4 py-3 flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-lg shrink-0">
                      {d.paymentType.icon || '🏦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.paymentType.name}</p>
                        {statusBadge(d.status)}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Owner: {d.owner.name || d.owner.email}</p>
                    </div>
                    {d.status !== 'REVOKED' && (
                      <button
                        onClick={() => revokeDelegation.mutate(d.id)}
                        className="text-xs text-red-500 px-2 py-1"
                      >
                        Revoke
                      </button>
                    )}
                  </div>

                  {d.status === 'ACTIVE' && (
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">You owe</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(outstanding)}</p>
                        {pendingApproval > 0 && (
                          <p className="text-xs text-amber-600">{fmt(pendingApproval)} pending owner confirmation</p>
                        )}
                      </div>
                      {outstanding > 0 && pendingExpenses.length > 0 && (
                        <button
                          onClick={() => setRepaySheet({ delegationId: d.id, expenses: pendingExpenses })}
                          className="px-3 py-1.5 bg-primary-500 text-white text-xs font-semibold rounded-lg"
                        >
                          Mark as paid
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Cards I own (incoming) ── */}
        <div className="px-4 pt-6">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            My cards others use
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-700">
            {!isLoading && incoming.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No one is using your cards</p>
            )}
            {incoming.map((d) => {
              const balItem = balance?.owedToMe?.find((b) => b.delegationId === d.id);
              const outstanding = balItem?.outstanding || 0;
              const pendingRepayments = balItem?.repayments || [];

              return (
                <div key={d.id} className="px-4 py-3 flex flex-col gap-2">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-lg shrink-0">
                      {d.paymentType.icon || '💳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.paymentType.name}</p>
                        {statusBadge(d.status)}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Used by: {d.requestedBy.name || d.requestedBy.email}</p>
                    </div>
                  </div>

                  {d.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveDelegation.mutate(d.id)}
                        disabled={approveDelegation.isPending}
                        className="flex-1 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectDelegation.mutate(d.id)}
                        disabled={rejectDelegation.isPending}
                        className="flex-1 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {d.status === 'ACTIVE' && (
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">They owe you</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(outstanding)}</p>
                        {pendingRepayments.length > 0 && (
                          <p className="text-xs text-amber-600">{pendingRepayments.length} payment claim(s) to review</p>
                        )}
                      </div>
                      <button
                        onClick={() => setOwnerSheet({ delegationId: d.id, personName: d.requestedBy.name || 'Card user', repayments: pendingRepayments })}
                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-500 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-300"
                      >
                        View charges
                      </button>
                    </div>
                  )}

                  {d.status === 'ACTIVE' && (
                    <button
                      onClick={() => revokeDelegation.mutate(d.id)}
                      className="text-xs text-red-500 text-left"
                    >
                      Revoke access
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav />

      {repaySheet && (
        <RepaySheet
          delegationId={repaySheet.delegationId}
          expenses={repaySheet.expenses}
          onClose={() => setRepaySheet(null)}
          onSubmit={handleRepay}
          isPending={createRepayment.isPending}
        />
      )}

      {ownerSheet && (
        <OwnerExpensesSheet
          delegationId={ownerSheet.delegationId}
          personName={ownerSheet.personName}
          repayments={ownerSheet.repayments}
          onClose={() => setOwnerSheet(null)}
          onApprove={(p) => approveRepayment.mutate(p)}
          onReject={(p) => rejectRepayment.mutate(p)}
          approveIsPending={approveRepayment.isPending}
          rejectIsPending={rejectRepayment.isPending}
        />
      )}
    </div>
  );
}
