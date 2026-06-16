import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import Button from '../../components/ui/Button';
import { usePaidForPerson, useRequestPayment, useAcceptPayment, useRejectPayment } from '../../hooks/useSplits';

function StatusBadge({ status }) {
  if (status === 'CONFIRMED')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Settled</span>;
  if (status === 'PAYMENT_REQUESTED')
    return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Claimed paid</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>;
}

export default function PersonExpensesPage() {
  const { personId } = useParams();
  const { data: expenses = [], isLoading } = usePaidForPerson(personId);

  const pay = useRequestPayment();
  const accept = useAcceptPayment();
  const reject = useRejectPayment();
  const isBusy = pay.isPending || accept.isPending || reject.isPending;

  const person = expenses[0]?.paidForPerson;
  const personName = person?.name || '…';

  const totalOutstanding = expenses.reduce((sum, e) => {
    const split = e.splits?.[0];
    return split?.status !== 'CONFIRMED' ? sum + Number(e.amount) : sum;
  }, 0);
  const totalSettled = expenses.reduce((sum, e) => {
    const split = e.splits?.[0];
    return split?.status === 'CONFIRMED' ? sum + Number(e.amount) : sum;
  }, 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title={personName} showBack />

      {/* Summary strip */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex gap-4">
        {totalOutstanding > 0 && (
          <div>
            <p className="text-xs text-gray-400">Outstanding</p>
            <p className="text-base font-bold text-amber-600">₹{totalOutstanding.toFixed(2)}</p>
          </div>
        )}
        {totalSettled > 0 && (
          <div>
            <p className="text-xs text-gray-400">Settled</p>
            <p className="text-base font-bold text-green-600">₹{totalSettled.toFixed(2)}</p>
          </div>
        )}
        {expenses.length === 0 && !isLoading && (
          <p className="text-sm text-gray-400">No expenses yet</p>
        )}
      </div>

      <div className="flex-1 p-4 pb-28 flex flex-col gap-3">
        {isLoading && <p className="text-center text-sm text-gray-400 mt-12">Loading…</p>}

        {!isLoading && expenses.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-16 gap-2">
            <span className="text-5xl">🧾</span>
            <p className="text-sm text-gray-400">No expenses paid for {personName}</p>
          </div>
        )}

        {expenses.map((expense) => {
          const split = expense.splits?.[0];
          const status = split?.status || 'PENDING';
          const amount = Number(expense.amount);
          const date = expense.expenseDate
            ? format(new Date(expense.expenseDate), 'd MMM yyyy')
            : '';

          return (
            <div key={expense.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {expense.title || 'Expense'}
                  </p>
                  <p className="text-xs text-gray-400">{date}</p>
                  {expense.category && (
                    <p className="text-xs text-gray-400 mt-0.5">{expense.category.name}</p>
                  )}
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-gray-900">₹{amount.toFixed(2)}</span>
                  <StatusBadge status={status} />
                </div>
              </div>

              {split && status === 'PAYMENT_REQUESTED' && (
                <div className="px-4 pb-3 flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1 !min-h-[36px] text-xs"
                    onClick={() => accept.mutate(split.id)}
                    disabled={isBusy}
                  >
                    Accept ✓
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1 !min-h-[36px] text-xs"
                    onClick={() => reject.mutate(split.id)}
                    disabled={isBusy}
                  >
                    Reject ✗
                  </Button>
                </div>
              )}

              {split && status === 'PENDING' && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-gray-400 text-center">
                    Waiting for {personName} to mark as paid
                  </p>
                </div>
              )}

              {status === 'CONFIRMED' && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-green-600 text-center">✓ Settled</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
