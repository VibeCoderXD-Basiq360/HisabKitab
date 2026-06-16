import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';

export default function ExpenseCard({ expense, onClick }) {
  const confirmedSplits = expense.splits?.filter((s) => s.status === 'CONFIRMED') || [];
  const settledAmount = confirmedSplits.reduce((s, sp) => s + Number(sp.amount), 0);
  const currentAmount = Number(expense.amount);
  const originalAmount = currentAmount + settledAmount;
  const isFullySettled = settledAmount > 0 && currentAmount === 0;
  const isPartiallySettled = settledAmount > 0 && currentAmount > 0;

  const settledNames = confirmedSplits.map((s) => s.person?.name).filter(Boolean);
  const settledLabel = settledNames.length === 1
    ? settledNames[0]
    : settledNames.length === 2
      ? `${settledNames[0]} & ${settledNames[1]}`
      : `${settledNames.length} people`;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isFullySettled ? 'bg-gray-50 active:bg-gray-100' : 'bg-white active:bg-gray-50'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${isFullySettled ? 'opacity-40' : ''}`}
        style={{ backgroundColor: expense.category?.color ? `${expense.category.color}25` : '#f3f4f6' }}
      >
        {expense.category?.icon || '💸'}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isFullySettled ? 'text-gray-400' : 'text-gray-900'}`}>
          {expense.title || expense.category?.name || 'Expense'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {expense.paymentType?.name} · {formatDate(expense.expenseDate)}
        </p>

        {/* Type badge */}
        <div className="flex flex-wrap gap-1 mt-0.5">
          {expense.paidForPersonId ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              🧾 Paid for {expense.paidForPerson?.name}
            </span>
          ) : expense.splits?.length > 0 && !isFullySettled ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
              ⚖️ Split
            </span>
          ) : null}

          {expense.recurringExpense && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
              🔁 {expense.recurringExpense.isActive ? 'Recurring' : 'Recurring (paused)'}
            </span>
          )}

          {/* Settlement log */}
          {isFullySettled && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              ✓ Settled · not in total
            </span>
          )}
          {isPartiallySettled && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              ↩ ₹{settledAmount.toFixed(0)} back from {settledLabel}
            </span>
          )}
        </div>
      </div>

      {/* Amount column */}
      <div className="shrink-0 text-right">
        {isFullySettled ? (
          <>
            <p className="text-xs text-gray-300 line-through">{formatCurrency(originalAmount)}</p>
            <p className="text-xs font-semibold text-green-500">₹0 net</p>
          </>
        ) : isPartiallySettled ? (
          <>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(currentAmount)}</p>
            <p className="text-xs text-gray-300 line-through">{formatCurrency(originalAmount)}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(currentAmount)}</p>
        )}
      </div>
    </button>
  );
}
