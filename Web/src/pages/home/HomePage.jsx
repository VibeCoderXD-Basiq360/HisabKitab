import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { startOfMonth, endOfMonth, subMonths, addMonths, format, isSameMonth } from 'date-fns';
import { useExpenses, useDeleteExpense, useCreateExpense } from '../../hooks/useExpenses';
import { useBalances } from '../../hooks/useSplits';
import { useBudgets } from '../../hooks/useBudgets';
import { useSavingsGoal } from '../../hooks/useSavingsGoal';
import { formatDate } from '../../utils/date';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import ExpenseCard from '../../components/ExpenseCard';
import MonthSummary from '../../components/MonthSummary';
import Button from '../../components/ui/Button';

const now = new Date();
const CURRENT_MONTH_FILTERS = {
  fromDate: startOfMonth(now).toISOString(),
  toDate:   endOfMonth(now).toISOString(),
  limit: 200,
};

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef();

  const [tab, setTab] = useState('overview'); // 'overview' | 'expenses'
  const [viewMonth, setViewMonth] = useState(now); // month shown in Expenses tab
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');

  // Keyboard shortcut / → switch to expenses tab + focus search
  useEffect(() => {
    if (searchParams.get('s') === '1') {
      setTab('expenses');
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const isSearching = query.length > 0;

  const viewMonthFilters = {
    fromDate: startOfMonth(viewMonth).toISOString(),
    toDate:   endOfMonth(viewMonth).toISOString(),
    limit: 300,
  };
  const isCurrentMonth = isSameMonth(viewMonth, now);

  const { data: budgets = [] } = useBudgets();
  const { data: currentMonthData, isLoading: currentMonthLoading } = useExpenses(CURRENT_MONTH_FILTERS);
  const { data: viewMonthData, isLoading: viewMonthLoading } = useExpenses(viewMonthFilters);
  const { data: searchData, isLoading: searchLoading } = useExpenses(
    { search: query, limit: 50 },
    { enabled: isSearching }
  );
  const { data: balances } = useBalances();
  const { data: savingsGoal } = useSavingsGoal();
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

  const monthTotal = currentMonthData?.data?.reduce((s, e) => s + (e.isReimbursement ? -Number(e.amount) : Number(e.amount)), 0) || 0;
  const monthCount = currentMonthData?.data?.length || 0;
  const viewMonthTotal = viewMonthData?.data?.reduce((s, e) => s + (e.isReimbursement ? -Number(e.amount) : Number(e.amount)), 0) || 0;
  const viewMonthCount = viewMonthData?.data?.length || 0;

  // Budget totals
  const budgetRows    = budgets.filter((b) => b.budget);
  const totalBudget   = budgetRows.reduce((s, b) => s + b.budget.amount, 0);
  const totalSpent    = budgetRows.reduce((s, b) => s + b.spent, 0);
  const budgetPct     = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const budgetColor   = budgetPct >= 100 ? 'bg-red-500' : budgetPct >= 80 ? 'bg-yellow-400' : 'bg-green-500';

  // Balance totals
  const totalIOwe     = balances?.iOwe?.reduce((s, g) => s + g.total, 0) || 0;
  const totalOwedToMe = balances?.owedToMe?.reduce((s, g) => s + g.total, 0) || 0;

  // Smart insight
  const insight = (() => {
    if (!currentMonthData?.data?.length) return null;
    const expenses = currentMonthData.data;
    const top = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount))[0];
    const catMap = {};
    for (const e of expenses) {
      if (e.category?.name) catMap[e.category.name] = (catMap[e.category.name] || 0) + Number(e.amount);
    }
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    const nearBudget = budgets.filter((b) => b.budget && b.percentage >= 70)
      .sort((a, b) => b.percentage - a.percentage)[0];
    if (nearBudget) return `⚠️ ${nearBudget.category.icon} ${nearBudget.category.name} budget at ${nearBudget.percentage}% — ₹${(nearBudget.budget.amount - nearBudget.spent).toLocaleString('en-IN')} left`;
    if (topCat) return `📊 Most spent on ${topCat[0]} — ₹${Math.round(topCat[1]).toLocaleString('en-IN')} this month`;
    if (top) return `💸 Biggest expense: "${top.title}" — ₹${Number(top.amount).toLocaleString('en-IN')}`;
    return null;
  })();

  // Savings goal data
  const sgTarget   = savingsGoal ? Number(savingsGoal.monthlySavings) : null;
  const sgIncome   = savingsGoal ? Number(savingsGoal.monthlyIncome) : null;
  const sgMaxSpend = sgIncome > 0 ? sgIncome - sgTarget : null;
  const sgPct      = sgMaxSpend ? Math.round((monthTotal / sgMaxSpend) * 100) : null;
  const sgRemain   = sgMaxSpend !== null ? sgMaxSpend - monthTotal : null;
  const sgIntact   = sgRemain === null || sgRemain >= 0;
  const sgColor    = sgPct === null ? 'bg-emerald-400' : sgPct >= 100 ? 'bg-red-500' : sgPct >= 80 ? 'bg-yellow-400' : 'bg-emerald-500';

  // Expense list (search or selected month)
  const expenses  = isSearching ? (searchData?.data || []) : (viewMonthData?.data || []);
  const isLoading = isSearching ? searchLoading : viewMonthLoading;

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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
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

      {/* Tab bar */}
      <div className="sticky top-[56px] z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 py-2 flex gap-2">
        <button
          onClick={() => setTab('overview')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'overview'
              ? 'bg-primary-500 text-white'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab('expenses')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'expenses'
              ? 'bg-primary-500 text-white'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Expenses {monthCount > 0 && tab !== 'expenses' && (
            <span className="ml-1 text-xs opacity-70">({monthCount})</span>
          )}
        </button>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="flex-1 overflow-auto pb-24 pt-4 flex flex-col gap-3">

          <MonthSummary total={monthTotal} count={monthCount} />

          {/* Budget bar */}
          {totalBudget > 0 && (
            <button
              onClick={() => navigate('/settings/budgets')}
              className="mx-4 bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex flex-col gap-1.5 shadow-sm text-left active:bg-gray-50 dark:active:bg-gray-700"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Monthly Budget</span>
                <span className={`text-xs font-bold ${budgetPct >= 100 ? 'text-red-500' : budgetPct >= 80 ? 'text-yellow-500' : 'text-green-600'}`}>
                  {budgetPct}% used
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${budgetColor}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                ₹{totalSpent.toLocaleString('en-IN')} spent of ₹{totalBudget.toLocaleString('en-IN')} · tap to manage
              </p>
            </button>
          )}

          {/* Savings goal */}
          {savingsGoal && (
            <button
              onClick={() => navigate('/settings/savings-goal')}
              className="mx-4 bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex flex-col gap-1.5 shadow-sm text-left active:bg-gray-50 dark:active:bg-gray-700"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">🎯 Savings Goal</span>
                <span className={`text-xs font-bold ${sgIntact ? 'text-emerald-600' : 'text-red-500'}`}>
                  {sgIntact ? '✓ On track' : '⚠ At risk'}
                </span>
              </div>
              {sgMaxSpend !== null && (
                <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${sgColor}`} style={{ width: `${Math.min(sgPct, 100)}%` }} />
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {sgMaxSpend !== null
                  ? sgRemain >= 0
                    ? `₹${monthTotal.toLocaleString('en-IN')} spent of ₹${sgMaxSpend.toLocaleString('en-IN')} · ₹${sgRemain.toLocaleString('en-IN')} left`
                    : `₹${Math.abs(sgRemain).toLocaleString('en-IN')} over budget — saving ₹${sgTarget.toLocaleString('en-IN')}/mo`
                  : `₹${sgTarget.toLocaleString('en-IN')}/mo goal · ₹${monthTotal.toLocaleString('en-IN')} spent this month`}
              </p>
            </button>
          )}

          {/* Smart insight */}
          {insight && (
            <div className="mx-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-700 rounded-2xl px-4 py-3">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">{insight}</p>
            </div>
          )}

          {/* Balance nudge cards */}
          {(totalIOwe > 0 || totalOwedToMe > 0) && (
            <div className="px-4 flex flex-col gap-2">
              {totalIOwe > 0 && (
                <button
                  onClick={() => navigate('/balances')}
                  className="w-full flex items-center justify-between bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl px-4 py-3 text-left active:bg-red-100 dark:active:bg-red-900/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">💸</span>
                    <div>
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">You owe ₹{totalIOwe.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-red-400">to {balances.iOwe.length} {balances.iOwe.length === 1 ? 'person' : 'people'} · Tap to settle</p>
                    </div>
                  </div>
                  <span className="text-red-300 text-lg">›</span>
                </button>
              )}
              {totalOwedToMe > 0 && (
                <button
                  onClick={() => navigate('/balances')}
                  className="w-full flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl px-4 py-3 text-left active:bg-green-100 dark:active:bg-green-900/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🤝</span>
                    <div>
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">₹{totalOwedToMe.toLocaleString('en-IN')} owed to you</p>
                      <p className="text-xs text-green-500">from {balances.owedToMe.length} {balances.owedToMe.length === 1 ? 'person' : 'people'} · Tap to review</p>
                    </div>
                  </div>
                  <span className="text-green-300 text-lg">›</span>
                </button>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── EXPENSES TAB ── */}
      {tab === 'expenses' && (
        <div className="flex-1 flex flex-col min-h-0">

          {/* Non-scrolling header: search + month nav */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 pt-3 pb-2 flex flex-col gap-2 shrink-0">
            {/* Search bar */}
            <div className="relative flex items-center">
              <span className="absolute left-3 text-gray-400 text-base pointer-events-none">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search expenses…"
                className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:bg-gray-50 dark:focus:bg-gray-600 focus:ring-2 focus:ring-primary-100 transition-all"
              />
              {searchInput && (
                <button onClick={clearSearch} className="absolute right-3 text-gray-400 hover:text-gray-600 text-sm font-medium">✕</button>
              )}
            </div>
            {/* Month navigation */}
            {!isSearching && (
              <div className="flex items-center justify-between py-0.5">
                <button
                  onClick={() => setViewMonth(m => subMonths(m, 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 text-xl leading-none"
                >‹</button>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {format(viewMonth, 'MMMM yyyy')}
                </span>
                <button
                  onClick={() => setViewMonth(m => addMonths(m, 1))}
                  disabled={isCurrentMonth}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 text-xl leading-none disabled:opacity-25 disabled:pointer-events-none"
                >›</button>
              </div>
            )}
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto pb-24">

            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-300 dark:text-gray-600 text-sm">Loading…</div>

            ) : isSearching && expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-4xl">🔍</span>
                <p className="text-sm text-gray-400">Nothing found for "{query}"</p>
              </div>

            ) : isSearching ? (
              <>
                <div className="px-4 pt-4 pb-1">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {expenses.length} result{expenses.length !== 1 ? 's' : ''} for "{query}"
                  </p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {expenses.map((e) => (
                    <ExpenseCard
                      key={e.id}
                      expense={e}
                      onClick={() => navigate(`/expense/${e.id}`)}
                      onDelete={(id) => deleteExpense.mutate(id)}
                      onDuplicate={handleDuplicate}
                    />
                  ))}
                </div>
              </>

            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 px-6">
                <span className="text-4xl">🗓️</span>
                <p className="text-gray-400 dark:text-gray-500 text-sm text-center">No expenses in {format(viewMonth, 'MMMM yyyy')}</p>
                {isCurrentMonth && <Button onClick={() => navigate('/expense/new')}>Add your first expense</Button>}
              </div>

            ) : (
              <>
                {/* Month total summary */}
                <div className="mx-4 mt-4 mb-2 bg-primary-500 rounded-2xl px-5 py-4 text-white">
                  <p className="text-xs font-medium opacity-70 mb-1">{format(viewMonth, 'MMMM yyyy')} · {viewMonthCount} expense{viewMonthCount !== 1 ? 's' : ''}</p>
                  <p className="text-3xl font-bold tracking-tight">
                    ₹{viewMonthTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs opacity-60 mt-1">
                    avg ₹{viewMonthCount > 0 ? Math.round(viewMonthTotal / viewMonthCount).toLocaleString('en-IN') : 0} / expense
                  </p>
                </div>

                {/* Grouped by day */}
                {Object.entries(grouped).map(([date, items]) => {
                  const dayTotal = items.reduce((s, e) => s + Number(e.amount), 0);
                  return (
                    <div key={date}>
                      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{date}</p>
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(dayTotal)}
                        </p>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
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
                })}
              </>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
