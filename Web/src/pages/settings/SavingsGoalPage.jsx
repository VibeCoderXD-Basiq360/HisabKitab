import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import Button from '../../components/ui/Button';
import { useSavingsGoal, useUpsertSavingsGoal, useDeleteSavingsGoal } from '../../hooks/useSavingsGoal';

export default function SavingsGoalPage() {
  const navigate = useNavigate();
  const { data: goal, isLoading } = useSavingsGoal();
  const upsert = useUpsertSavingsGoal();
  const remove = useDeleteSavingsGoal();

  const [income, setIncome] = useState('');
  const [savings, setSavings] = useState('');

  useEffect(() => {
    if (goal) {
      setIncome(Number(goal.monthlyIncome) > 0 ? String(Number(goal.monthlyIncome)) : '');
      setSavings(String(Number(goal.monthlySavings)));
    }
  }, [goal]);

  const hasGoal = !!goal;
  const maxSpend = income && savings ? Number(income) - Number(savings) : null;

  function handleSave() {
    const s = Number(savings);
    if (!s || s <= 0) return;
    upsert.mutate(
      { monthlyIncome: Number(income) || 0, monthlySavings: s },
      { onSuccess: () => navigate('/settings') }
    );
  }

  function handleDelete() {
    if (!window.confirm('Remove your savings goal?')) return;
    remove.mutate(undefined, { onSuccess: () => navigate('/settings') });
  }

  if (isLoading) return <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900"><TopBar title="Savings Goal" showBack /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="Savings Goal" showBack />
      <div className="flex-1 pb-24 p-4 flex flex-col gap-4">

        {/* Explainer */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl px-4 py-3">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">How it works</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
            Set how much you want to save each month. Optionally enter your income so we can compute your max spending budget. Your home screen will show if the goal is intact.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col gap-4">
          {/* Monthly income (optional) */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Monthly income <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="e.g. 80000"
                className="w-full pl-7 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
              />
            </div>
          </div>

          {/* Monthly savings target */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Monthly savings target
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input
                type="number"
                inputMode="decimal"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
                placeholder="e.g. 15000"
                className="w-full pl-7 pr-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
              />
            </div>
          </div>

          {/* Derived max spend */}
          {maxSpend !== null && (
            <div className={`rounded-xl px-4 py-3 ${maxSpend >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              {maxSpend >= 0 ? (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You can spend up to <span className="font-bold">₹{maxSpend.toLocaleString('en-IN')}</span>/month and still hit your savings goal.
                </p>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Your savings target exceeds your income by ₹{Math.abs(maxSpend).toLocaleString('en-IN')}. Adjust the numbers.
                </p>
              )}
            </div>
          )}
        </div>

        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!savings || Number(savings) <= 0 || upsert.isPending}
        >
          {upsert.isPending ? 'Saving…' : hasGoal ? 'Update Goal' : 'Set Goal'}
        </Button>

        {hasGoal && (
          <button
            onClick={handleDelete}
            disabled={remove.isPending}
            className="text-sm text-red-500 text-center py-2 disabled:opacity-50"
          >
            {remove.isPending ? 'Removing…' : 'Remove goal'}
          </button>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
