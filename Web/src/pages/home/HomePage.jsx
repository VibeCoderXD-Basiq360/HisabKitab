import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useExpenses, useDeleteExpense, useCreateExpense } from '../../hooks/useExpenses';
import { useBalances } from '../../hooks/useSplits';
import { useBudgets } from '../../hooks/useBudgets';
import { formatDate } from '../../utils/date';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import ExpenseCard from '../../components/ExpenseCard';
import MonthSummary from '../../components/MonthSummary';
import Button from '../../components/ui/Button';

const now = new Date();
const MONTH_FILTERS = {
  fromDate: startOfMonth(now).toISOString(),
  toDate: endOfMonth(now).toISOString(),
  limit: 200,
};

export default function HomePage() {
  const navigate = useNavigate();
  const inputRef = useRef();

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  // Debounce search input by 300ms
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const isSearching = query.length > 0;

  const { data: budgets = [] } = useBudgets();

  // Smart insight derived from already-loaded data — no extra API call
  const insight = (() => {
    if (!monthData?.data?.length) return null;
    const expenses = monthData.data;
    // Biggest single expense
    const top = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
    // Most-spent category
    const catMap = {};
    for (const e of expenses) {
      if (e.category?.name) catMap[e.category.name] = (catMap[e.category.name] || 0) + Number(e.amount);
    }
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    // Budget closest to limit
    const nearBudget = budgets.filter((b) => b.budget && b.percentage >= 70)
      .sort((a, b) => b.percentage - a.percentage)[0];

    if (nearBudget) return `⚠️ ${nearBudget.category.icon} ${nearBudget.category.name} budget at ${nearBudget.percentage}% — ₹${(nearBudget.budget.amount - nearBudget.spent).toLocaleString('en-IN')} left`;
    if (topCat) return `📊 Most spent on ${topCat[0]} — ₹${Math.round(topCat[1]).toLocaleString('en-IN')} this month`;
    if (top) return `💸 Biggest expense: "${top.title}" — ₹${Number(top.amount).toLocaleString('en-IN')}`;
    return null;
  })();

  const budgetRows = budgets.filter((b) => b.budget);
  const totalBudget = budgetRows.reduce((s, b) => s + b.budget.amount, 0);
  const totalBudgetSpent = budgetRows.reduce((s, b) => s + b.spent, 0);
  const budgetPct = totalBudget > 0 ? Math.round((totalBudgetSpent / totalBudget) * 100) : 0;
  const budgetBarColor = budgetPct >= 100 ? 'bg-red-500' : budgetPct >= 80 ? 'bg-yellow-400' : 'bg-green-500';

  const deleteExpense = useDeleteExpense();
  const createExpense = useCreateExpense();

  function handleDuplicate(expense) {
    createExpense.mutate({
      amount: Number(expense.amount),
      currency: expense.currency || 'INR',
      title: expense.title,
      note: expense.note,
      expenseDate: new Date().toISOString(),
      categoryId: expense.categoryId,
      paymentTypeId: expense.paymentTypeId,
      peopleIds: [],
    });
  }

  const { data: balances } = useBalances();
  const totalIOwe = balances?.iOwe?.reduce((s, g) => s + g.total, 0) || 0;
  const totalOwedToMe = balances?.owedToMe?.reduce((s, g) => s + g.total, 0) || 0;

  const { data: monthData, isLoading: monthLoading } = useExpenses(MONTH_FILTERS);
  const { data: searchData, isLoading: searchLoading } = useExpenses(
    { search: query, limit: 50 },
    { enabled: isSearching }
  );

  const expenses = isSearching ? (searchData?.data || []) : (monthData?.data || []);
  const isLoading = isSearching ? searchLoading : monthLoading;

  const monthTotal = monthData?.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
  const monthCount = monthData?.data?.length || 0;

  const grouped = expenses.reduce((acc, e) => {
    const key = formatDate(e.expenseDate);
    (acc[key] = acc[key] || []).push(e);
    return acc;
  }, {});

  const clearSearch = () => {
    setSearchInput('');
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar
        title="HisabKitab"
        showBell
        action={
          <button
            onClick={() => navigate('/expense/new')}
            className="w-10 h-10 flex items-center justify-center text-2xl text-primary-600 font-light"
            aria-label="Add expense"
          >
            +
          </button>
        }
      />

      {/* Search bar */}
      <div className="sticky top-[56px] z-10 bg-white border-b border-gray-100 px-4 py-2">
        <div className="relative flex items-center">
          <span className="absolute left-3 text-gray-400 text-base pointer-events-none">🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search expenses…"
            className="w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:bg-gray-50 focus:ring-2 focus:ring-primary-100 transition-all"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-3 text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-24">
        {/* Month summary — only when not searching */}
        {!isSearching && (
          <div className="pt-4">
            <MonthSummary total={monthTotal} count={monthCount} />
          </div>
        )}

        {/* Budget summary bar */}
        {!isSearching && totalBudget > 0 && (
          <button
            onClick={() => navigate('/settings/budgets')}
            className="mx-4 mt-3 bg-white rounded-2xl px-4 py-3 flex flex-col gap-1.5 shadow-sm text-left active:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Monthly Budget</span>
              <span className={`text-xs font-bold ${budgetPct >= 100 ? 'text-red-500' : budgetPct >= 80 ? 'text-yellow-500' : 'text-green-600'}`}>
                {budgetPct}% used
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${budgetBarColor}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-400">
              ₹{totalBudgetSpent.toLocaleString('en-IN')} spent of ₹{totalBudget.toLocaleString('en-IN')} · tap to manage
            </p>
          </button>
        )}

        {/* Smart insight */}
        {!isSearching && insight && (
          <div className="mx-4 mt-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
            <p className="text-xs text-indigo-700 font-medium">{insight}</p>
          </div>
        )}

        {/* Balance nudge cards */}
        {!isSearching && (totalIOwe > 0 || totalOwedToMe > 0) && (
          <div className="px-4 pt-3 flex flex-col gap-2">
            {totalIOwe > 0 && (
              <button
                onClick={() => navigate('/balances')}
                className="w-full flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-left active:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">💸</span>
                  <div>
                    <p className="text-sm font-semibold text-red-700">You owe ₹{totalIOwe.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-red-400">
                      to {balances.iOwe.length} {balances.iOwe.length === 1 ? 'person' : 'people'} · Tap to settle
                    </p>
                  </div>
                </div>
                <span className="text-red-300 text-lg">›</span>
              </button>
            )}
            {totalOwedToMe > 0 && (
              <button
                onClick={() => navigate('/balances')}
                className="w-full flex items-center justify-between bg-green-50 border border-green-100 rounded-2xl px-4 py-3 text-left active:bg-green-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🤝</span>
                  <div>
                    <p className="text-sm font-semibold text-green-700">₹{totalOwedToMe.toLocaleString('en-IN')} owed to you</p>
                    <p className="text-xs text-green-500">
                      from {balances.owedToMe.length} {balances.owedToMe.length === 1 ? 'person' : 'people'} · Tap to review
                    </p>
                  </div>
                </div>
                <span className="text-green-300 text-lg">›</span>
              </button>
            )}
          </div>
        )}

        {/* Search results header */}
        {isSearching && !isLoading && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm text-gray-500">
              {expenses.length === 0
                ? `No results for "${query}"`
                : `${expenses.length} result${expenses.length !== 1 ? 's' : ''} for "${query}"`}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-300 text-sm">
            Loading…
          </div>
        ) : expenses.length === 0 && !isSearching ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 px-6">
            <p className="text-gray-400 text-sm">No expenses this month</p>
            <Button onClick={() => navigate('/expense/new')}>Add your first expense</Button>
          </div>
        ) : expenses.length === 0 && isSearching ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-4xl">🔍</span>
            <p className="text-sm text-gray-400">Nothing found for "{query}"</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => {
            const dayTotal = items.reduce((sum, e) => sum + Number(e.amount), 0);
            return (
              <div key={date}>
                <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{date}</p>
                  <p className="text-xs font-semibold text-gray-400">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    }).format(dayTotal)}
                  </p>
                </div>
                <div className="divide-y divide-gray-100 bg-white mx-0">
                  {items.map((e) => (
                    <ExpenseCard
                      key={e.id}
                      expense={e}
                      onClick={() => navigate(`/expense/${e.id}`)}
                      onDelete={(id) => deleteExpense.mutate(id)}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
}
