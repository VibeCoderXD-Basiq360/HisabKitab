import { useState } from 'react';
import { useParams } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useBudgets, useUpsertBudget, useDeleteBudget } from '../../hooks/useBudgets';

function barColor(pct) {
  if (pct >= 100) return 'bg-red-500';
  if (pct >= 80) return 'bg-yellow-400';
  return 'bg-green-500';
}
function barBg(pct) {
  if (pct >= 100) return 'bg-red-100';
  if (pct >= 80) return 'bg-yellow-100';
  return 'bg-green-100';
}

function BudgetSheet({ item, onClose }) {
  const [amount, setAmount] = useState(item.budget ? String(item.budget.amount) : '');
  const upsert = useUpsertBudget();
  const del = useDeleteBudget();

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-10 flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: item.category.color ? `${item.category.color}25` : '#f3f4f6' }}
          >
            {item.category.icon || '🏷️'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {item.budget ? 'Edit limit' : 'Set limit'} for {item.category.name}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Monthly spending limit</p>
          </div>
        </div>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">₹</span>
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-base font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-primary-400"
            autoFocus
          />
        </div>

        <button
          onClick={() => {
            const val = parseFloat(amount);
            if (!val || val <= 0) return;
            upsert.mutate({ categoryId: item.categoryId, amount: val }, { onSuccess: onClose });
          }}
          disabled={upsert.isPending || !amount || parseFloat(amount) <= 0}
          className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-50"
        >
          {upsert.isPending ? 'Saving…' : 'Save Limit'}
        </button>

        {item.budget && (
          <button
            onClick={() => del.mutate(item.budget.id, { onSuccess: onClose })}
            disabled={del.isPending}
            className="w-full py-2.5 rounded-xl border border-red-100 text-red-500 text-sm font-medium"
          >
            {del.isPending ? 'Removing…' : 'Remove Limit'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function CategoryBudgetPage() {
  const { categoryId } = useParams();
  const [editOpen, setEditOpen] = useState(false);

  const { data: allBudgets = [], isLoading } = useBudgets();
  const item = allBudgets.find((b) => b.categoryId === categoryId);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <TopBar title="Budget" showBack />
        <p className="text-center text-sm text-gray-400 mt-16">Loading…</p>
        <BottomNav />
      </div>
    );
  }

  if (!item) return null;

  const cat = item.category;
  const budget = item.budget;
  const spent = item.spent;
  const percentage = budget ? Math.round((spent / budget.amount) * 100) : null;
  const remaining = budget ? budget.amount - spent : null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={cat.name} showBack />

      <div className="flex-1 p-4 pb-28 flex flex-col gap-4">
        {budget ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: cat.color ? `${cat.color}25` : '#f3f4f6' }}
                >
                  {cat.icon || '🏷️'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{cat.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Monthly budget</p>
                </div>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="text-xs text-primary-500 font-semibold px-3 py-1.5 rounded-full bg-primary-50"
              >
                Edit
              </button>
            </div>

            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Spent this month</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  ₹{spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Limit</p>
                <p className="text-xl font-semibold text-gray-500 dark:text-gray-400">
                  ₹{budget.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            <div className={`w-full h-3 rounded-full ${barBg(percentage)} mb-3`}>
              <div
                className={`h-3 rounded-full transition-all duration-500 ${barColor(percentage)}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">{percentage}% used</p>
              {remaining >= 0 ? (
                <p className="text-sm font-semibold text-green-600">
                  ₹{remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} left
                </p>
              ) : (
                <p className="text-sm font-semibold text-red-500">
                  ₹{Math.abs(remaining).toLocaleString('en-IN', { maximumFractionDigits: 0 })} over budget
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: cat.color ? `${cat.color}25` : '#f3f4f6' }}
              >
                {cat.icon || '🏷️'}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{cat.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">No monthly limit set</p>
              </div>
            </div>

            <p className="text-xs text-gray-400">
              ₹{spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} spent this month with no limit.
            </p>

            <button
              onClick={() => setEditOpen(true)}
              className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm"
            >
              Set Monthly Limit
            </button>
          </div>
        )}
      </div>

      <BottomNav />

      {editOpen && <BudgetSheet item={item} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
