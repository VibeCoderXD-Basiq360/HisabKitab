import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startOfMonth, endOfMonth, subMonths, addMonths, format, isSameMonth } from 'date-fns';
import { useExpenses, useDeleteExpense, useCreateExpense } from '../../hooks/useExpenses';
import { useCartStore } from '../../store/cartStore';
import { useBalances } from '../../hooks/useSplits';
import { useBudgets } from '../../hooks/useBudgets';
import { useSavingsGoal } from '../../hooks/useSavingsGoal';
import { useIncomeSummary } from '../../hooks/useIncome';
import { useTemplates, useUseTemplate } from '../../hooks/useTemplates';
import { useFinancialGoals } from '../../hooks/useFinancialGoals';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { formatDate } from '../../utils/date';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import ExpenseCard from '../../components/ExpenseCard';
import TransferExpenseSheet from '../expense/TransferExpenseSheet';
import MonthSummary from '../../components/MonthSummary';
import CreditCardDueBanner from '../../components/CreditCardDueBanner';
import Button from '../../components/ui/Button';

const now = new Date();
const CURRENT_MONTH_FILTERS = {
  fromDate: startOfMonth(now).toISOString(),
  toDate:   endOfMonth(now).toISOString(),
  limit: 200,
};

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef();

  const [tab, setTab] = useState('overview'); // 'overview' | 'expenses'
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [transferringExpense, setTransferringExpense] = useState(null);
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
    const timer = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isSearching = query.length > 0;

  const viewMonthFilters = {
    fromDate: startOfMonth(viewMonth).toISOString(),
    toDate:   endOfMonth(viewMonth).toISOString(),
    limit: 300,
  };
  const isCurrentMonth = isSameMonth(viewMonth, now);

  const { data: budgets = [] } = useBudgets();
  const { data: incomeSummary } = useIncomeSummary(CURRENT_MONTH_FILTERS);
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
  const { data: templates = [] } = useTemplates();
  const { data: financialGoals = [] } = useFinancialGoals();
  const useTemplate = useUseTemplate();
  const { isOnline, isSyncing, pendingCount, failedCount, syncQueue, syncResult, clearSyncResult, queue, retryFailed, dequeue } = useOfflineQueue();
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.length;

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
        title={t('home.title')}
        showBell
        showSearch
        action={
          <div className="flex items-center gap-1">
            {/* Cart button with badge */}
            <button
              onClick={() => navigate('/cart')}
              className="relative w-10 h-10 flex items-center justify-center text-xl"
              title="Shopping Cart"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute top-1.5 right-1 min-w-[16px] h-4 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>
            {templates.length > 0 && (
              <button
                onClick={() => setShowQuickAdd(true)}
                className="w-10 h-10 flex items-center justify-center text-xl"
                title="Quick Add"
              >
                ⚡
              </button>
            )}
            <button
              onClick={() => navigate('/expense/new')}
              className="w-10 h-10 flex items-center justify-center text-2xl text-primary-600 font-light"
              aria-label={t('home.add_expense')}
            >
              +
            </button>
          </div>
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
          {t('home.overview')}
        </button>
        <button
          onClick={() => setTab('expenses')}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === 'expenses'
              ? 'bg-primary-500 text-white'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {t('home.expenses')} {monthCount > 0 && tab !== 'expenses' && (
            <span className="ml-1 text-xs opacity-70">({monthCount})</span>
          )}
        </button>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="flex-1 overflow-auto pb-24 pt-4 flex flex-col gap-3">

          <MonthSummary total={monthTotal} count={monthCount} />

          {/* Income · Expenses · Net card */}
          {incomeSummary?.total > 0 ? (
            <button
              onClick={() => navigate('/income')}
              className="mx-4 bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm text-left active:bg-gray-50 dark:active:bg-gray-700"
            >
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">This Month</p>
              <div className="flex items-center gap-1 text-sm">
                <span className="flex-1 text-center">
                  <span className="block text-base font-bold text-emerald-600">₹{Math.round(incomeSummary.total).toLocaleString('en-IN')}</span>
                  <span className="text-xs text-gray-400">Income</span>
                </span>
                <span className="text-gray-300 dark:text-gray-600">−</span>
                <span className="flex-1 text-center">
                  <span className="block text-base font-bold text-gray-800 dark:text-gray-100">₹{Math.round(monthTotal).toLocaleString('en-IN')}</span>
                  <span className="text-xs text-gray-400">Expenses</span>
                </span>
                <span className="text-gray-300 dark:text-gray-600">=</span>
                <span className="flex-1 text-center">
                  {(() => {
                    const net = incomeSummary.total - monthTotal;
                    return (
                      <>
                        <span className={`block text-base font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {net >= 0 ? '+' : ''}₹{Math.round(Math.abs(net)).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-gray-400">Net</span>
                      </>
                    );
                  })()}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => navigate('/income')}
              className="mx-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl px-4 py-3 flex items-center justify-between text-left active:bg-emerald-100 dark:active:bg-emerald-900/30"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">💰</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Log income to see net savings</p>
                  <p className="text-xs text-emerald-500">Track salary, freelance, and more →</p>
                </div>
              </div>
            </button>
          )}

          <CreditCardDueBanner />

          {/* Offline / queue status */}
          {!isOnline && (
            <div className="mx-4 flex items-center gap-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
              <span className="text-xl">📵</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">You're offline</p>
                <p className="text-xs text-gray-400">New expenses will be queued and synced on reconnect.</p>
              </div>
            </div>
          )}

          {(pendingCount > 0 || failedCount > 0) && (
            <div className={`mx-4 rounded-2xl px-4 py-3 border ${failedCount > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold ${failedCount > 0 ? 'text-red-700 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
                    {isSyncing ? '⏳ Syncing…' : failedCount > 0 ? `⚠️ ${failedCount} failed to sync` : `⏳ ${pendingCount} queued offline`}
                  </p>
                  <p className={`text-xs mt-0.5 ${failedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-500'}`}>
                    {failedCount > 0 ? 'Tap to review and retry failed items' : isOnline ? 'Tap "Sync now" to upload' : 'Will sync automatically when online'}
                  </p>
                </div>
                {isOnline && pendingCount > 0 && !isSyncing && (
                  <button
                    onClick={syncQueue}
                    className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 rounded-lg"
                  >
                    Sync now
                  </button>
                )}
              </div>

              {/* Failed items list */}
              {failedCount > 0 && (
                <div className="mt-3 space-y-2">
                  {queue.filter((i) => i.status === 'failed').map((item) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {item.data.title} · ₹{Number(item.data.amount).toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-red-500 truncate">{item.error}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => retryFailed(item.id)} className="text-xs text-blue-600 dark:text-blue-400 font-medium px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30">Retry</button>
                        <button onClick={() => dequeue(item.id)} className="text-xs text-red-500 font-medium px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20">Discard</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sync success toast */}
          {syncResult && isOnline && (
            <div className="mx-4">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-2xl px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                  ✓ Synced {syncResult.synced} expense{syncResult.synced !== 1 ? 's' : ''}
                  {syncResult.failed > 0 ? ` · ${syncResult.failed} failed` : ''}
                </p>
                <button onClick={clearSyncResult} className="text-emerald-500 text-lg leading-none">✕</button>
              </div>
            </div>
          )}

          {/* Budget bar */}
          {totalBudget > 0 && (
            <button
              onClick={() => navigate('/settings/budgets')}
              className="mx-4 bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 flex flex-col gap-1.5 shadow-sm text-left active:bg-gray-50 dark:active:bg-gray-700"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('home.monthly_budget')}</span>
                <span className={`text-xs font-bold ${budgetPct >= 100 ? 'text-red-500' : budgetPct >= 80 ? 'text-yellow-500' : 'text-green-600'}`}>
                  {budgetPct}{t('home.pct_used')}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${budgetColor}`} style={{ width: `${Math.min(budgetPct, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t('home.budget_spent', {
                  spent: totalSpent.toLocaleString('en-IN'),
                  total: totalBudget.toLocaleString('en-IN'),
                })}
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
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">🎯 {t('home.savings_goal')}</span>
                <span className={`text-xs font-bold ${sgIntact ? 'text-emerald-600' : 'text-red-500'}`}>
                  {sgIntact ? `✓ ${t('home.on_track')}` : `⚠ ${t('home.at_risk')}`}
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

          {/* Financial goals strip */}
          {financialGoals.filter((g) => !g.isCompleted).length > 0 && (
            <div className="mx-4">
              <button
                onClick={() => navigate('/settings/goals')}
                className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm active:bg-gray-50 dark:active:bg-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">🎯 Financial Goals</span>
                  <span className="text-xs text-primary-600 dark:text-primary-400">Manage →</span>
                </div>
                <div className="space-y-2">
                  {financialGoals.filter((g) => !g.isCompleted).slice(0, 3).map((g) => {
                    const target = Number(g.targetAmount);
                    const saved  = Number(g.savedAmount);
                    const pct    = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                    const barMap = { emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500', amber: 'bg-amber-500', rose: 'bg-rose-500', cyan: 'bg-cyan-500' };
                    const bar    = barMap[g.color] || 'bg-emerald-500';
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{g.emoji || '🎯'} {g.name}</span>
                          <span className="text-gray-400">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </button>
            </div>
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
                      <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                        {t('home.owe_you', { amount: totalIOwe.toLocaleString('en-IN') })}
                      </p>
                      <p className="text-xs text-red-400">
                        {balances.iOwe.length === 1
                          ? t('home.owe_person', { n: balances.iOwe.length })
                          : t('home.owe_people', { n: balances.iOwe.length })}
                      </p>
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
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                        {t('home.owed_you', { amount: totalOwedToMe.toLocaleString('en-IN') })}
                      </p>
                      <p className="text-xs text-green-500">
                        {balances.owedToMe.length === 1
                          ? t('home.owed_person', { n: balances.owedToMe.length })
                          : t('home.owed_people', { n: balances.owedToMe.length })}
                      </p>
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
                placeholder={t('home.search_placeholder')}
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
              <div className="flex items-center justify-center py-20 text-gray-300 dark:text-gray-600 text-sm">{t('common.loading')}</div>

            ) : isSearching && expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <span className="text-4xl">🔍</span>
                <p className="text-sm text-gray-400">{t('home.nothing_found', { query })}</p>
              </div>

            ) : isSearching ? (
              <>
                <div className="px-4 pt-4 pb-1">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {expenses.length === 1
                      ? t('home.results_one', { n: expenses.length, query })
                      : t('home.results_other', { n: expenses.length, query })}
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
                      onTransfer={(exp) => setTransferringExpense(exp)}
                    />
                  ))}
                </div>
              </>

            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 px-6">
                <span className="text-4xl">🗓️</span>
                <p className="text-gray-400 dark:text-gray-500 text-sm text-center">
                  {t('home.no_expenses_month', { month: format(viewMonth, 'MMMM yyyy') })}
                </p>
                {isCurrentMonth && <Button onClick={() => navigate('/expense/new')}>{t('home.add_first')}</Button>}
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
                    {t('home.avg_per_expense', {
                      n: viewMonthCount > 0 ? Math.round(viewMonthTotal / viewMonthCount).toLocaleString('en-IN') : 0,
                    })}
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

      {/* Quick Add Sheet */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowQuickAdd(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-t-2xl p-5 pb-8 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">⚡ Quick Add</h2>
              <button
                onClick={() => navigate('/settings/templates')}
                className="text-xs text-primary-500 font-semibold"
              >
                Manage templates →
              </button>
            </div>
            {templates.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No templates yet. Save an expense as a template from the Add Expense screen.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {templates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={async () => {
                      setShowQuickAdd(false);
                      useTemplate.mutate(tmpl.id);
                      navigate('/expense/new', { state: { template: tmpl } });
                    }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 text-left active:bg-primary-50 dark:active:bg-primary-900/30 transition-colors border border-gray-100 dark:border-gray-600"
                  >
                    <div className="text-2xl mb-2">{tmpl.emoji || tmpl.category?.icon || '💸'}</div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight truncate">{tmpl.title}</p>
                    {tmpl.amount && (
                      <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mt-1">
                        ₹{Number(tmpl.amount).toLocaleString('en-IN')}
                      </p>
                    )}
                    {tmpl.category && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{tmpl.category.icon} {tmpl.category.name}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />

      {transferringExpense && (
        <TransferExpenseSheet
          expense={transferringExpense}
          onClose={() => setTransferringExpense(null)}
        />
      )}
    </div>
  );
}
