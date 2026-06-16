import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import Button from '../../components/ui/Button';
import { useBalances, usePaidForSummary, useRequestPayment, useAcceptPayment, useRejectPayment } from '../../hooks/useSplits';

function StatusBadge({ status }) {
  if (status === 'PENDING')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>;
  if (status === 'PAYMENT_REQUESTED')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Claimed paid</span>;
  return null;
}

function SplitRow({ split, mode, onAccept, onReject, onPay, isBusy }) {
  const title = split.expense?.title || 'Expense';
  const amount = Number(split.amount);
  const date = split.expense?.expenseDate
    ? format(new Date(split.expense.expenseDate), 'd MMM')
    : '';

  return (
    <div className="px-4 py-3 border-t border-gray-50 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-gray-800 truncate">{title}</p>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <span className="text-sm font-semibold text-gray-900">₹{amount.toFixed(2)}</span>
          <StatusBadge status={split.status} />
        </div>
      </div>

      {mode === 'owed' && split.status === 'PAYMENT_REQUESTED' && (
        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1 !min-h-[36px] text-xs"
            onClick={() => onAccept(split.id)}
            disabled={isBusy}
          >
            Accept ✓
          </Button>
          <Button
            variant="danger"
            className="flex-1 !min-h-[36px] text-xs"
            onClick={() => onReject(split.id)}
            disabled={isBusy}
          >
            Reject ✗
          </Button>
        </div>
      )}

      {mode === 'iowe' && split.status === 'PENDING' && (
        <Button
          variant="outline"
          className="w-full !min-h-[36px] text-xs"
          onClick={() => onPay(split.id)}
          disabled={isBusy}
        >
          Mark as paid
        </Button>
      )}

      {mode === 'iowe' && split.status === 'PAYMENT_REQUESTED' && (
        <p className="text-xs text-amber-600 text-center py-1">⏳ Waiting for confirmation…</p>
      )}
    </div>
  );
}

function PersonCard({ group, mode, onAccept, onReject, onPay, isBusy }) {
  const [expanded, setExpanded] = useState(true);
  const name = mode === 'owed' ? group.personName : group.payerName;
  const total = group.total;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <button
        className="w-full flex items-center px-4 py-3 gap-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-base font-bold text-primary-600 shrink-0">
          {name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">
            {group.splits.length} {group.splits.length === 1 ? 'expense' : 'expenses'}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-base font-bold ${mode === 'owed' ? 'text-green-600' : 'text-red-500'}`}>
            ₹{total.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">{mode === 'owed' ? 'owes you' : 'you owe'}</p>
        </div>
        <span className="text-gray-300 text-xs ml-1">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded &&
        group.splits.map((split) => (
          <SplitRow
            key={split.id}
            split={split}
            mode={mode}
            onAccept={onAccept}
            onReject={onReject}
            onPay={onPay}
            isBusy={isBusy}
          />
        ))}
    </div>
  );
}

function PaidForPersonCard({ person }) {
  const navigate = useNavigate();
  const hasOutstanding = person.totalOutstanding > 0;

  return (
    <button
      className="w-full bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3 text-left"
      onClick={() => navigate(`/balances/person/${person.personId}`)}
    >
      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-base font-bold text-amber-600 shrink-0">
        {person.personName?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">{person.personName}</p>
        <p className="text-xs text-gray-400">{person.expenseCount} {person.expenseCount === 1 ? 'expense' : 'expenses'}</p>
      </div>
      <div className="text-right">
        {hasOutstanding ? (
          <>
            <p className="text-base font-bold text-amber-600">₹{person.totalOutstanding.toFixed(2)}</p>
            <p className="text-xs text-gray-400">outstanding</p>
          </>
        ) : (
          <>
            <p className="text-base font-bold text-green-600">✓ Settled</p>
            <p className="text-xs text-gray-400">₹{person.totalSettled.toFixed(2)}</p>
          </>
        )}
      </div>
      <span className="text-gray-300 text-xs ml-1">›</span>
    </button>
  );
}

export default function BalancesPage() {
  const [tab, setTab] = useState('owed');
  const { data, isLoading } = useBalances();
  const { data: paidFor = [], isLoading: paidForLoading } = usePaidForSummary();
  const pay = useRequestPayment();
  const accept = useAcceptPayment();
  const reject = useRejectPayment();

  const isBusy = pay.isPending || accept.isPending || reject.isPending;
  const owedCount = data?.owedToMe?.reduce((s, g) => s + g.splits.length, 0) || 0;
  const iOweCount = data?.iOwe?.reduce((s, g) => s + g.splits.length, 0) || 0;
  const paidForCount = paidFor.filter((p) => p.totalOutstanding > 0).length;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title="Balances" />

      <div className="flex bg-white border-b border-gray-100 sticky top-0 z-10">
        <button
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            tab === 'owed' ? 'text-primary-600 border-primary-500' : 'text-gray-400 border-transparent'
          }`}
          onClick={() => setTab('owed')}
        >
          Owed to me
          {owedCount > 0 && (
            <span className="bg-primary-100 text-primary-600 text-xs rounded-full px-1.5 py-0.5 leading-none">
              {owedCount}
            </span>
          )}
        </button>
        <button
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
            tab === 'iowe' ? 'text-red-500 border-red-400' : 'text-gray-400 border-transparent'
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
            tab === 'paidfor' ? 'text-amber-600 border-amber-500' : 'text-gray-400 border-transparent'
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

        {!isLoading && tab === 'owed' && (
          data?.owedToMe?.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-16 gap-3">
              <span className="text-5xl">🎉</span>
              <p className="text-sm text-gray-400">No one owes you right now</p>
            </div>
          ) : (
            data?.owedToMe?.map((group) => (
              <PersonCard
                key={group.personId}
                group={group}
                mode="owed"
                onAccept={(id) => accept.mutate(id)}
                onReject={(id) => reject.mutate(id)}
                isBusy={isBusy}
              />
            ))
          )
        )}

        {!isLoading && tab === 'iowe' && (
          data?.iOwe?.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-16 gap-3">
              <span className="text-5xl">✅</span>
              <p className="text-sm text-gray-400">You don't owe anyone right now</p>
            </div>
          ) : (
            data?.iOwe?.map((group) => (
              <PersonCard
                key={group.payerUserId}
                group={group}
                mode="iowe"
                onPay={(id) => pay.mutate({ splitId: id })}
                isBusy={isBusy}
              />
            ))
          )
        )}

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
