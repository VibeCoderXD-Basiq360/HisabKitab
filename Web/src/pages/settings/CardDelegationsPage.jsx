import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import VerifyIdentitySheet from '../../components/VerifyIdentitySheet';
import { usePaymentTypes } from '../../hooks/usePaymentTypes';
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
  useLinkOwnerCard,
  useCombinedBill,
} from '../../hooks/useCardDelegation';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => format(new Date(d), 'd MMM yyyy');

// ─── Repay sheet ──────────────────────────────────────────────────────────────
function RepaySheet({ delegationId, expenses, onClose, onSubmit, isPending }) {
  const [selected, setSelected] = useState(new Set());
  const [note, setNote] = useState('');

  const toggle = (id) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const total = expenses.filter((e) => selected.has(e.id)).reduce((s, e) => s + Number(e.amount), 0);

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

// ─── Owner expenses + repayment review ───────────────────────────────────────
function OwnerExpensesSheet({ delegationId, personName, onClose, onApprove, onReject, repayments, approveIsPending, rejectIsPending }) {
  const { t } = useTranslation();
  const { data: expenses = [], isLoading } = useDelegationExpenses(delegationId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl px-4 pt-5 pb-8 flex flex-col gap-4 max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto" />
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{personName}'s charges on your card</h2>
        {repayments.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pending payment claims</p>
            {repayments.map((r) => (
              <div key={r.id} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{fmt(r.amount)}</p>
                  <p className="text-xs text-amber-600">{fmtDate(r.createdAt)}</p>
                </div>
                <button onClick={() => onApprove({ delegationId, repaymentId: r.id })} disabled={approveIsPending} className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg">Approve</button>
                <button onClick={() => onReject({ delegationId, repaymentId: r.id })} disabled={rejectIsPending} className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-lg">Reject</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto flex flex-col gap-1">
          {isLoading && <p className="text-sm text-gray-400 text-center py-4">{t('common.loading')}</p>}
          {!isLoading && expenses.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No expenses yet</p>}
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-1 py-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{e.title || 'Expense'}</p>
                <p className="text-xs text-gray-400">{fmtDate(e.expenseDate)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(e.amount)}</p>
                {e.willRepay && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${e.isRepaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
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

// ─── Link owner's own card ────────────────────────────────────────────────────
function LinkMyCardSheet({ delegation, onClose }) {
  const { data: myTypes = [] } = usePaymentTypes();
  const linkOwnerCard = useLinkOwnerCard();
  const creditCards = myTypes.filter((t) => t.cardType === 'CREDIT_CARD');
  const [verifyFor, setVerifyFor] = useState(null); // ownerPaymentTypeId pending verify

  const handleSelect = (ptId) => setVerifyFor(ptId);

  const doLink = async (ptId, actionToken) => {
    try {
      await linkOwnerCard.mutateAsync({ delegationId: delegation.id, ownerPaymentTypeId: ptId, _actionToken: actionToken });
      onClose();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to link card');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl px-4 pt-5 pb-8 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto" />
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Link your card</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Select your credit card entry for this physical card so you can see a combined bill
          </p>
        </div>
        {creditCards.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No credit cards in your Payment Types. Add one first.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {creditCards.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                disabled={linkOwnerCard.isPending}
                className="flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-left active:bg-gray-50 dark:active:bg-gray-600 disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-lg shrink-0">
                  {t.icon || '🏦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.name}</p>
                  {(t.cardLastFour || t.cardHolderName) && (
                    <p className="text-xs text-gray-400 font-mono">
                      {t.cardLastFour ? `•••• ${t.cardLastFour}` : ''}
                      {t.cardHolderName ? `  ${t.cardHolderName}` : ''}
                    </p>
                  )}
                </div>
                <span className="text-primary-500 text-sm">Select →</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {verifyFor && (
        <VerifyIdentitySheet
          title="Verify to link card"
          description="Linking your card to a delegation requires identity verification"
          onVerified={(token) => { setVerifyFor(null); doLink(verifyFor, token); }}
          onClose={() => setVerifyFor(null)}
        />
      )}
    </div>
  );
}

// ─── Combined bill sheet ──────────────────────────────────────────────────────
function CombinedBillSheet({ delegationId, onClose }) {
  const { data, isLoading } = useCombinedBill(delegationId);

  if (!data && !isLoading) return null;

  const cycleLabel = data
    ? `${fmtDate(data.cycleStart)} – ${fmtDate(data.cycleEnd)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl px-4 pt-5 pb-8 flex flex-col gap-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto" />
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Combined Bill</h2>
          {data?.card && (
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {data.card.cardLastFour ? `•••• ${data.card.cardLastFour}` : data.card.name}
              {data.card.cardHolderName ? `  ·  ${data.card.cardHolderName}` : ''}
            </p>
          )}
          {cycleLabel && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Cycle: {cycleLabel}</p>}
        </div>

        {isLoading && <p className="text-sm text-gray-400 text-center py-8">{t('common.loading')}</p>}

        {data && (
          <>
            {/* Summary */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-indigo-600 dark:text-indigo-400">{data.owner.name}'s charges</span>
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{fmt(data.summary.ownerTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-indigo-600 dark:text-indigo-400">{data.requester.name}'s charges</span>
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{fmt(data.summary.requesterTotal)}</span>
              </div>
              <div className="h-px bg-indigo-200 dark:bg-indigo-800" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-indigo-800 dark:text-indigo-200">Combined total</span>
                <span className="text-base font-bold text-indigo-800 dark:text-indigo-200">{fmt(data.summary.combinedTotal)}</span>
              </div>
              {data.summary.willRepayTotal > 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {data.requester.name} will repay {fmt(data.summary.willRepayTotal)}
                </p>
              )}
            </div>

            {/* Owner's expenses */}
            {data.ownerExpenses.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {data.owner.name}'s expenses
                </p>
                {data.ownerExpenses.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-lg">{e.category?.icon || '💳'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{e.title || 'Expense'}</p>
                      <p className="text-xs text-gray-400">{fmtDate(e.expenseDate)}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">{fmt(e.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Requester's expenses */}
            {data.requesterExpenses.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {data.requester.name}'s expenses
                </p>
                {data.requesterExpenses.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-700">
                    <span className="text-lg">{e.category?.icon || '💳'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{e.title || 'Expense'}</p>
                      <p className="text-xs text-gray-400">{fmtDate(e.expenseDate)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(e.amount)}</p>
                      {e.willRepay && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${e.isRepaid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {e.isRepaid ? 'Repaid' : 'To repay'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!data.hasOwnerCard && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                Link your card entry to see your own expenses here
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CardDelegationsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useCardDelegations();
  const { data: balance }   = useCardDelegationBalance();
  const approveDelegation   = useApproveDelegation();
  const rejectDelegation    = useRejectDelegation();
  const revokeDelegation    = useRevokeDelegation();
  const createRepayment     = useCreateRepayment();
  const approveRepayment    = useApproveRepayment();
  const rejectRepayment     = useRejectRepayment();

  const [repaySheet, setRepaySheet]         = useState(null); // { delegationId, expenses }
  const [ownerSheet, setOwnerSheet]         = useState(null); // { delegationId, personName, repayments }
  const [linkCardSheet, setLinkCardSheet]   = useState(null); // delegation object
  const [billSheet, setBillSheet]           = useState(null); // delegationId
  const [verifySheet, setVerifySheet]       = useState(null); // { action: fn }

  const outgoing = data?.outgoing || [];
  const incoming = data?.incoming || [];

  const handleRepay = async (payload) => {
    await createRepayment.mutateAsync(payload);
    setRepaySheet(null);
  };

  const requireVerify = (actionFn) => setVerifySheet({ actionFn });

  const statusBadge = (status) => {
    if (status === 'PENDING') return <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{t('balance.pending')}</span>;
    if (status === 'ACTIVE')  return <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>;
    return <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Revoked</span>;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('settings.shared_cards')} showBack />
      <div className="flex-1 pb-24 overflow-auto">

        {/* ── Cards I use (outgoing) ── */}
        <div className="px-4 pt-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
            Cards I use (Dad / others pay)
          </p>
          <div className="bg-white dark:bg-gray-800 rounded-2xl divide-y divide-gray-100 dark:divide-gray-700">
            {isLoading && <p className="px-4 py-6 text-sm text-gray-400 text-center">{t('common.loading')}</p>}
            {!isLoading && outgoing.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">
                No delegations yet — go to Payment Types to link a credit card
              </p>
            )}
            {outgoing.map((d) => {
              const balItem         = balance?.iOwe?.find((b) => b.delegationId === d.id);
              const outstanding     = balItem?.outstanding || 0;
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
                      {(d.paymentType.cardLastFour || d.paymentType.cardHolderName) && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {d.paymentType.cardLastFour ? `•••• ${d.paymentType.cardLastFour}` : ''}
                          {d.paymentType.cardHolderName ? `  ${d.paymentType.cardHolderName}` : ''}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">Owner: {d.owner.name || d.owner.email}</p>
                    </div>
                    {d.status !== 'REVOKED' && (
                      <button onClick={() => revokeDelegation.mutate(d.id)} className="text-xs text-red-500 px-2 py-1">Revoke</button>
                    )}
                  </div>

                  {d.status === 'ACTIVE' && (
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('balance.you_owe')}</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(outstanding)}</p>
                        {pendingApproval > 0 && (
                          <p className="text-xs text-amber-600">{fmt(pendingApproval)} pending owner confirmation</p>
                        )}
                      </div>
                      <button
                        onClick={() => setBillSheet(d.id)}
                        className="px-3 py-1.5 border border-indigo-300 dark:border-indigo-700 text-xs font-semibold rounded-lg text-indigo-600 dark:text-indigo-400"
                      >
                        Combined bill
                      </button>
                      {outstanding > 0 && pendingExpenses.length > 0 && (
                        <button
                          onClick={() => setRepaySheet({ delegationId: d.id, expenses: pendingExpenses })}
                          className="px-3 py-1.5 bg-primary-500 text-white text-xs font-semibold rounded-lg"
                        >
                          Mark paid
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
              const balItem         = balance?.owedToMe?.find((b) => b.delegationId === d.id);
              const outstanding     = balItem?.outstanding || 0;
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
                      {(d.paymentType.cardLastFour || d.paymentType.cardHolderName) && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {d.paymentType.cardLastFour ? `•••• ${d.paymentType.cardLastFour}` : ''}
                          {d.paymentType.cardHolderName ? `  ${d.paymentType.cardHolderName}` : ''}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">Used by: {d.requestedBy.name || d.requestedBy.email}</p>
                    </div>
                  </div>

                  {d.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => requireVerify((token) => approveDelegation.mutateAsync({ id: d.id, _actionToken: token }))}
                        disabled={approveDelegation.isPending}
                        className="flex-1 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectDelegation.mutate(d.id)}
                        disabled={rejectDelegation.isPending}
                        className="flex-1 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {d.status === 'ACTIVE' && (
                    <>
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('balance.owes_you')}</p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{fmt(outstanding)}</p>
                          {pendingRepayments.length > 0 && (
                            <p className="text-xs text-amber-600">{pendingRepayments.length} payment claim(s) to review</p>
                          )}
                        </div>
                        <button
                          onClick={() => setBillSheet(d.id)}
                          className="px-3 py-1.5 border border-indigo-300 dark:border-indigo-700 text-xs font-semibold rounded-lg text-indigo-600 dark:text-indigo-400"
                        >
                          Combined bill
                        </button>
                        <button
                          onClick={() => setOwnerSheet({ delegationId: d.id, personName: d.requestedBy.name || 'Card user', repayments: pendingRepayments })}
                          className="px-3 py-1.5 border border-gray-300 dark:border-gray-500 text-xs font-semibold rounded-lg text-gray-700 dark:text-gray-300"
                        >
                          View charges
                        </button>
                      </div>

                      {/* Link my card / show linked */}
                      {d.ownerPaymentType ? (
                        <div className="flex items-center gap-2 px-1">
                          <span className="text-xs text-green-600 dark:text-green-400">
                            🔗 Your card linked: {d.ownerPaymentType.name}
                            {d.ownerPaymentType.cardLastFour ? ` (•••• ${d.ownerPaymentType.cardLastFour})` : ''}
                          </span>
                          <button onClick={() => setLinkCardSheet(d)} className="text-xs text-gray-400 underline">Change</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setLinkCardSheet(d)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 text-left px-1"
                        >
                          + Link your card to this delegation (for combined bill)
                        </button>
                      )}

                      <button onClick={() => revokeDelegation.mutate(d.id)} className="text-xs text-red-500 text-left px-1">
                        Revoke access
                      </button>
                    </>
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

      {linkCardSheet && (
        <LinkMyCardSheet
          delegation={linkCardSheet}
          onClose={() => setLinkCardSheet(null)}
        />
      )}

      {billSheet && (
        <CombinedBillSheet
          delegationId={billSheet}
          onClose={() => setBillSheet(null)}
        />
      )}

      {verifySheet && (
        <VerifyIdentitySheet
          title="Verify to approve"
          description="Granting card access requires identity verification for your security"
          onVerified={async (actionToken) => {
            setVerifySheet(null);
            try {
              await verifySheet.actionFn(actionToken);
            } catch (err) {
              alert(err?.response?.data?.error || 'Action failed');
            }
          }}
          onClose={() => setVerifySheet(null)}
        />
      )}
    </div>
  );
}
