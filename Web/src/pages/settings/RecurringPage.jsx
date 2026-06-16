import { format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useRecurring, useToggleRecurring, useDeleteRecurring } from '../../hooks/useRecurring';

const FREQ_LABEL = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly' };
const FREQ_ICON  = { DAILY: '📅', WEEKLY: '🗓️', MONTHLY: '📆', YEARLY: '🎯' };

export default function RecurringPage() {
  const { data: items = [], isLoading } = useRecurring();
  const toggle = useToggleRecurring();
  const del = useDeleteRecurring();

  const handleDelete = (id, title) => {
    if (window.confirm(`Delete recurring "${title || 'expense'}"? Past instances are kept.`)) {
      del.mutate(id);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title="Recurring Expenses" showBack />

      <div className="flex-1 p-4 pb-28 flex flex-col gap-3">
        {isLoading && <p className="text-center text-sm text-gray-400 mt-12">Loading…</p>}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-16 gap-3">
            <span className="text-5xl">🔁</span>
            <p className="text-sm text-gray-500 font-medium">No recurring expenses yet</p>
            <p className="text-xs text-gray-400 text-center">
              When adding an expense, enable "Make this recurring" to auto-create it every day / week / month / year.
            </p>
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${!item.isActive ? 'opacity-60' : ''}`}>
            <div className="px-4 py-3 flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: item.category?.color ? `${item.category.color}25` : '#f3f4f6' }}
              >
                {item.category?.icon || '💸'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {item.title || item.category?.name || 'Expense'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.paymentType?.name} · {FREQ_ICON[item.frequency]} {FREQ_LABEL[item.frequency]}
                </p>
                <p className="text-xs text-gray-400">
                  Next: {format(new Date(item.nextDueDate), 'd MMM yyyy')}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900">
                  ₹{Number(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-400">{FREQ_LABEL[item.frequency].toLowerCase()}</p>
              </div>
            </div>

            <div className="px-4 pb-3 flex gap-2 border-t border-gray-50 pt-2">
              <button
                onClick={() => toggle.mutate({ id: item.id, isActive: !item.isActive })}
                disabled={toggle.isPending}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  item.isActive
                    ? 'border-gray-200 text-gray-600 bg-white'
                    : 'border-primary-200 text-primary-600 bg-primary-50'
                }`}
              >
                {item.isActive ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button
                onClick={() => handleDelete(item.id, item.title)}
                disabled={del.isPending}
                className="flex-1 py-2 rounded-xl text-xs font-medium border border-red-100 text-red-500 bg-red-50"
              >
                🗑 Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
