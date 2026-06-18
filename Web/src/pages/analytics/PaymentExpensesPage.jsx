import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import ExpenseCard from '../../components/ExpenseCard';
import { useExpenses } from '../../hooks/useExpenses';
import { usePaymentTypes } from '../../hooks/usePaymentTypes';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function PaymentExpensesPage() {
  const { paymentTypeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const periodLabel = searchParams.get('period') || '';

  const { data: paymentTypes = [] } = usePaymentTypes();
  const paymentType = paymentTypes.find((p) => p.id === paymentTypeId);

  const { data: expenseData, isLoading } = useExpenses({
    paymentTypeId,
    ...(fromDate && { fromDate }),
    ...(toDate && { toDate }),
    limit: 500,
  });

  const expenses = expenseData?.data || [];
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const iconBg = paymentType?.color ? `${paymentType.color}25` : '#f3f4f6';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={paymentType?.name || 'Payment Method'} showBack />

      <div className="flex-1 p-4 pb-28 flex flex-col gap-4">
        {/* Summary header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: iconBg }}
          >
            {paymentType?.icon || '💳'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500">{periodLabel || 'All expenses'}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(total)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Expense list */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1">Transactions</p>

          {isLoading ? (
            <p className="text-center text-sm text-gray-400 py-10">Loading…</p>
          ) : expenses.length === 0 ? (
            <div className="bg-white rounded-2xl py-12 flex flex-col items-center gap-2">
              <span className="text-4xl">💳</span>
              <p className="text-sm text-gray-400">No expenses for this period</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
              {expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onClick={() => navigate(`/expense/${expense.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
