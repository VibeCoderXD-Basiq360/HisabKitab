import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';

export default function ExpenseCard({ expense, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white active:bg-gray-50 text-left"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: expense.category?.color ? `${expense.category.color}25` : '#f3f4f6' }}
      >
        {expense.category?.icon || '💸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {expense.title || expense.category?.name || 'Expense'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {expense.paymentType?.name} · {formatDate(expense.expenseDate)}
          {expense.people?.length > 0 && ` · ${expense.people.length} ${expense.people.length === 1 ? 'person' : 'people'}`}
        </p>
        {expense.splits?.length > 0 && (
          <span className="inline-flex items-center gap-1 mt-0.5 text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
            ⚖️ Split
          </span>
        )}
      </div>
      <span className="text-sm font-semibold text-gray-900 shrink-0">
        {formatCurrency(expense.amount)}
      </span>
    </button>
  );
}
