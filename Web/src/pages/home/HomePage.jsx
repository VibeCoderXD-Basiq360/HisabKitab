import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startOfMonth, endOfMonth, subMonths, addMonths, format, isSameMonth, isToday, isYesterday } from 'date-fns';
import { useExpenses, useDeleteExpense, useCreateExpense } from '../../hooks/useExpenses';
import { useBusinessExpensesFeed } from '../../hooks/useBusiness';
import { useBalances } from '../../hooks/useSplits';
import { useBudgets } from '../../hooks/useBudgets';
import { useSavingsGoal } from '../../hooks/useSavingsGoal';
import { useIncomeSummary } from '../../hooks/useIncome';
import { useFinancialGoals } from '../../hooks/useFinancialGoals';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../utils/date';
import TopBar from '../../components/TopBar';
import QuickActionsCard from '../../components/QuickActionsCard';
import TransferExpenseSheet from '../expense/TransferExpenseSheet';
import CreditCardDueBanner from '../../components/CreditCardDueBanner';
import HeroCard from '../../components/ui/HeroCard';
import SurfaceCard from '../../components/ui/SurfaceCard';
import TransactionRow from '../../components/ui/TransactionRow';
import ProgressBar from '../../components/ui/ProgressBar';

const now = new Date();
const CURRENT_MONTH_FILTERS = {
  fromDate: startOfMonth(now).toISOString(),
  toDate:   endOfMonth(now).toISOString(),
  limit: 200,
};

const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

function catBg(category) {
  if (!category?.color) return '#F3F4F6';
  const map = {
    emerald: 'rgba(16,185,129,0.13)',
    blue:    'rgba(59,130,246,0.13)',
    red:     'rgba(239,68,68,0.13)',
    orange:  'rgba(249,115,22,0.13)',
    purple:  'rgba(124,58,237,0.13)',
    yellow:  'rgba(245,158,11,0.13)',
    pink:    'rgba(236,72,153,0.13)',
    cyan:    'rgba(6,182,212,0.13)',
    teal:    'rgba(0,194,178,0.13)',
    violet:  'rgba(124,58,237,0.13)',
    rose:    'rgba(244,63,94,0.13)',
    amber:   'rgba(245,158,11,0.13)',
  };
  return map[category.color] || '#F3F4F6';
}

function dateLabel(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd MMM');
}


export default function HomePage() {
  const { t } = useTranslation();
  const navigate  = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef  = useRef();

  const profile = useAuthStore((s) => s.profile);
  const user    = useAuthStore((s) => s.user);
  const firstName = (profile?.name || user?.displayName || '').split(' ')[0] || 'there';
  const hour    = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [tab, setTab]                         = useState('overview');
  const [transferringExpense, setTransferringExpense] = useState(null);
  const [viewMonth, setViewMonth]             = useState(now);
  const [searchInput, setSearchInput]         = useState('');
  const [query, setQuery]                     = useState('');

  useEffect(() => {
    if (searchParams.get('s') === '1') {
      setTab('expenses');
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const isSearching = query.length > 0;
  const isCurrentMonth = isSameMonth(viewMonth, now);

  const viewMonthFilters = {
    fromDate: startOfMonth(viewMonth).toISOString(),
    toDate:   endOfMonth(viewMonth).toISOString(),
    limit: 300,
  };

  const { data: budgets = [] }                                   = useBudgets();
  const { data: incomeSummary }                                  = useIncomeSummary(CURRENT_MONTH_FILTERS);
  const { data: currentMonthData, isLoading: currentMonthLoading } = useExpenses(CURRENT_MONTH_FILTERS);
  const { data: viewMonthData,    isLoading: viewMonthLoading }  = useExpenses(viewMonthFilters);
  const { data: bizExpenses = [] }                               = useBusinessExpensesFeed({
    from: startOfMonth(viewMonth).toISOString(),
    to:   endOfMonth(viewMonth).toISOString(),
  });
  const { data: searchData, isLoading: searchLoading }           = useExpenses(
    { search: query, limit: 50 },
    { enabled: isSearching }
  );
  const { data: balances }           = useBalances();
  const { data: savingsGoal }        = useSavingsGoal();
  const deleteExpense                = useDeleteExpense();
  const createExpense                = useCreateExpense();
  const { data: financialGoals = [] } = useFinancialGoals();
  const {
    isOnline, isSyncing, pendingCount, failedCount,
    syncQueue, syncResult, clearSyncResult, queue, retryFailed, dequeue,
  } = useOfflineQueue();

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

  const monthTotal    = currentMonthData?.data?.reduce((s, e) => s + (e.isReimbursement ? -Number(e.amount) : Number(e.amount)), 0) || 0;
  const monthCount    = currentMonthData?.data?.length || 0;
  const viewMonthTotal = viewMonthData?.data?.reduce((s, e) => s + (e.isReimbursement ? -Number(e.amount) : Number(e.amount)), 0) || 0;
  const viewMonthCount = viewMonthData?.data?.length || 0;

  const budgetRows  = budgets.filter((b) => b.budget);
  const totalBudget = budgetRows.reduce((s, b) => s + b.budget.amount, 0);
  const totalSpent  = budgetRows.reduce((s, b) => s + b.spent, 0);
  const budgetPct   = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const totalIOwe     = balances?.iOwe?.reduce((s, g) => s + g.total, 0) || 0;
  const totalOwedToMe = balances?.owedToMe?.reduce((s, g) => s + g.total, 0) || 0;

  const incomeTotal = incomeSummary?.total || 0;
  const savedAmt    = incomeTotal > 0 ? incomeTotal - monthTotal : null;

  const sgTarget   = savingsGoal ? Number(savingsGoal.monthlySavings) : null;
  const sgIncome   = savingsGoal ? Number(savingsGoal.monthlyIncome) : null;
  const sgMaxSpend = sgIncome > 0 ? sgIncome - sgTarget : null;
  const sgPct      = sgMaxSpend > 0 ? Math.round((monthTotal / sgMaxSpend) * 100) : null;
  const sgRemain   = sgMaxSpend !== null ? sgMaxSpend - monthTotal : null;

  const heroPct = totalBudget > 0 ? budgetPct : sgPct;

  const insight = (() => {
    if (!currentMonthData?.data?.length) return null;
    const expenses = currentMonthData.data;
    const catMap = {};
    for (const e of expenses) {
      if (e.category?.name) catMap[e.category.name] = (catMap[e.category.name] || 0) + Number(e.amount);
    }
    const topCat    = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    const nearBudget = budgets.filter((b) => b.budget && b.percentage >= 70).sort((a, b) => b.percentage - a.percentage)[0];
    if (nearBudget) return `${nearBudget.category.icon} ${nearBudget.category.name} budget at ${nearBudget.percentage}% — ${fmt(nearBudget.budget.amount - nearBudget.spent)} left`;
    if (topCat) return `Most spent on ${topCat[0]} — ${fmt(topCat[1])} this month`;
    return null;
  })();

  // Expenses for view month tab
  const bizExpensesMapped = isSearching ? [] : bizExpenses.map(b => ({
    ...b, _isBusiness: true, expenseDate: b.date,
    title: b.vendor || b.category, note: b.note, isReimbursement: false,
  }));
  const rawExpenses = isSearching ? (searchData?.data || []) : (viewMonthData?.data || []);
  const isLoading   = isSearching ? searchLoading : viewMonthLoading;
  const expenses    = [...rawExpenses, ...bizExpensesMapped].sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));
  const grouped     = expenses.reduce((acc, e) => {
    const key = formatDate(e.expenseDate);
    (acc[key] = acc[key] || []).push(e);
    return acc;
  }, {});

  // Recent 5 for overview tab
  const recentExpenses = (currentMonthData?.data || []).slice(0, 5);

  const clearSearch = () => { setSearchInput(''); setQuery(''); inputRef.current?.blur(); };

  return (
    <div style={{ minHeight: '100vh', background: '#F0F2F7', display: 'flex', flexDirection: 'column' }}>

      <TopBar
        greeting={greeting}
        title={firstName}

      />

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        margin: '0 20px 16px',
        background: '#E9ECF0',
        borderRadius: 14,
        padding: 4,
        gap: 4,
      }}>
        {['overview', 'expenses'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 11,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              background: tab === t ? '#FFFFFF' : 'transparent',
              color: tab === t ? '#0A0D14' : '#B0B8C4',
              boxShadow: tab === t ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t === 'overview' ? 'Overview' : `Expenses${monthCount > 0 && tab !== 'expenses' ? ` (${monthCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ══════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

          {/* Hero Card */}
          <div style={{ padding: '0 16px 16px' }}>
            <HeroCard>
              {/* Month + count */}
              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {format(now, 'MMMM yyyy')} · {monthCount} expense{monthCount !== 1 ? 's' : ''}
              </p>

              {/* Spent total */}
              <p style={{ fontSize: 38, fontWeight: 800, color: '#FFFFFF', lineHeight: 1, marginBottom: 16, letterSpacing: '-1px' }}>
                {fmt(monthTotal)}
              </p>

              {/* Budget / savings progress */}
              {heroPct !== null && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
                      {totalBudget > 0 ? 'Budget used' : 'Spend limit'}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: heroPct >= 100 ? '#FB7185' : heroPct >= 80 ? '#FBBF24' : '#00C2B2' }}>
                      {heroPct}%
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(heroPct, 100)}%`,
                      borderRadius: 2,
                      background: heroPct >= 100 ? 'linear-gradient(90deg,#F43F5E,#FB7185)' : heroPct >= 80 ? 'linear-gradient(90deg,#F59E0B,#FBBF24)' : 'linear-gradient(90deg,#00C2B2,#00D896)',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Stats grid */}
              <div style={{ display: 'flex', gap: 0 }}>
                {[
                  { label: 'Income', value: incomeTotal > 0 ? fmt(incomeTotal) : '—', color: '#10B981' },
                  { label: 'Spent',  value: fmt(monthTotal),  color: '#F43F5E' },
                  { label: 'Saved',  value: savedAmt !== null && savedAmt >= 0 ? fmt(savedAmt) : '—', color: '#00C2B2' },
                ].map((item, i) => (
                  <div key={item.label} style={{
                    flex: 1,
                    textAlign: 'center',
                    paddingLeft: i > 0 ? 8 : 0,
                    borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: item.color, marginBottom: 3 }}>{item.value}</p>
                    <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
                  </div>
                ))}
              </div>
            </HeroCard>
          </div>

          {/* Quick Actions */}
          <div style={{ padding: '0 16px 16px' }}>
            <QuickActionsCard />
          </div>

          {/* Balance Nudge — 2 cards side by side */}
          {(totalIOwe > 0 || totalOwedToMe > 0) && (
            <div style={{ padding: '0 16px 16px', display: 'flex', gap: 10 }}>
              {totalIOwe > 0 && (
                <button
                  onClick={() => navigate('/balances')}
                  style={{
                    flex: 1, borderRadius: 18, padding: '14px 14px',
                    background: 'linear-gradient(135deg,#FFF1F3,#FFE4E8)',
                    border: '1px solid rgba(225,29,72,0.12)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <p style={{ fontSize: 9, fontWeight: 800, color: '#F43F5E', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>You Owe</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#E11D48', lineHeight: 1, marginBottom: 4 }}>{fmt(totalIOwe)}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#F43F5E', opacity: 0.7 }}>
                    {balances?.iOwe?.length || 0} {balances?.iOwe?.length === 1 ? 'person' : 'people'}
                  </p>
                </button>
              )}
              {totalOwedToMe > 0 && (
                <button
                  onClick={() => navigate('/balances')}
                  style={{
                    flex: 1, borderRadius: 18, padding: '14px 14px',
                    background: 'linear-gradient(135deg,#F0FDF4,#DCFCE7)',
                    border: '1px solid rgba(5,150,105,0.12)',
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <p style={{ fontSize: 9, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Owed to You</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#059669', lineHeight: 1, marginBottom: 4 }}>{fmt(totalOwedToMe)}</p>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#059669', opacity: 0.7 }}>
                    {balances?.owedToMe?.length || 0} {balances?.owedToMe?.length === 1 ? 'person' : 'people'}
                  </p>
                </button>
              )}
            </div>
          )}

          <CreditCardDueBanner />

          {/* Offline / sync status */}
          {!isOnline && (
            <div style={{ margin: '0 16px 12px' }}>
              <SurfaceCard style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📵</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14' }}>You're offline</p>
                  <p style={{ fontSize: 11, fontWeight: 500, color: '#B0B8C4', marginTop: 2 }}>Expenses will sync on reconnect</p>
                </div>
              </SurfaceCard>
            </div>
          )}
          {(pendingCount > 0 || failedCount > 0) && (
            <div style={{ margin: '0 16px 12px' }}>
              <SurfaceCard style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: failedCount > 0 ? '#E11D48' : '#F59E0B' }}>
                      {isSyncing ? 'Syncing…' : failedCount > 0 ? `${failedCount} failed to sync` : `${pendingCount} queued`}
                    </p>
                    <p style={{ fontSize: 11, fontWeight: 500, color: '#B0B8C4', marginTop: 2 }}>
                      {failedCount > 0 ? 'Tap to retry failed items' : isOnline ? 'Tap to sync now' : 'Will sync when online'}
                    </p>
                  </div>
                  {isOnline && pendingCount > 0 && !isSyncing && (
                    <button
                      onClick={syncQueue}
                      style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2', background: '#E6FAF9', padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer' }}
                    >
                      Sync
                    </button>
                  )}
                </div>
                {failedCount > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {queue.filter((i) => i.status === 'failed').map((item) => (
                      <div key={item.id} style={{ background: '#FFF1F3', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0D14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.data.title} · ₹{Number(item.data.amount).toLocaleString('en-IN')}
                          </p>
                          <p style={{ fontSize: 11, color: '#E11D48', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.error}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => retryFailed(item.id)} style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', background: '#EEF2FF', padding: '4px 10px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Retry</button>
                          <button onClick={() => dequeue(item.id)} style={{ fontSize: 11, fontWeight: 700, color: '#E11D48', background: '#FFF1F3', padding: '4px 10px', borderRadius: 10, border: 'none', cursor: 'pointer' }}>Discard</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SurfaceCard>
            </div>
          )}
          {syncResult && isOnline && (
            <div style={{ margin: '0 16px 12px' }}>
              <SurfaceCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>✓ Synced {syncResult.synced} expense{syncResult.synced !== 1 ? 's' : ''}{syncResult.failed > 0 ? ` · ${syncResult.failed} failed` : ''}</p>
                <button onClick={clearSyncResult} style={{ color: '#B0B8C4', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </SurfaceCard>
            </div>
          )}

          {/* Smart insight */}
          {insight && (
            <div style={{ margin: '0 16px 12px' }}>
              <SurfaceCard style={{ padding: '14px 16px', borderLeft: '3px solid #00C2B2' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#0A0D14' }}>💡 Insight</p>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginTop: 4 }}>{insight}</p>
              </SurfaceCard>
            </div>
          )}

          {/* Recent Transactions */}
          {recentExpenses.length > 0 && (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0A0D14' }}>Recent</p>
                <button
                  onClick={() => setTab('expenses')}
                  style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  See all →
                </button>
              </div>
              <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
                {recentExpenses.map((e, i) => (
                  <TransactionRow
                    key={e.id}
                    icon={e.category?.icon || e.title?.[0]?.toUpperCase() || '?'}
                    iconBg={catBg(e.category)}
                    title={e.title}
                    subtitle={`${e.category?.name || ''}${e.paymentType?.name ? ' · ' + e.paymentType.name : ''}`.trim().replace(/^·\s*/, '') || dateLabel(e.expenseDate)}
                    amount={fmt(Number(e.amount))}
                    isIncome={e.isReimbursement}
                    isLast={i === recentExpenses.length - 1}
                    onClick={() => navigate(`/expense/${e.id}`)}
                  />
                ))}
              </SurfaceCard>
            </div>
          )}

          {/* Financial goals strip */}
          {financialGoals.filter((g) => !g.isCompleted).length > 0 && (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#0A0D14' }}>Goals</p>
                <button onClick={() => navigate('/settings/goals')} style={{ fontSize: 12, fontWeight: 700, color: '#00C2B2', background: 'none', border: 'none', cursor: 'pointer' }}>Manage →</button>
              </div>
              <SurfaceCard>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {financialGoals.filter((g) => !g.isCompleted).slice(0, 3).map((g) => {
                    const target = Number(g.targetAmount);
                    const saved  = Number(g.savedAmount);
                    const pct    = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
                    return (
                      <div key={g.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0D14' }}>{g.emoji || '🎯'} {g.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#B0B8C4' }}>{pct}%</span>
                        </div>
                        <ProgressBar pct={pct} height={5} />
                      </div>
                    );
                  })}
                </div>
              </SurfaceCard>
            </div>
          )}

        </div>
      )}

      {/* ══ EXPENSES TAB ══════════════════════════════════════════════════ */}
      {tab === 'expenses' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* Sticky header: search + month nav */}
          <div style={{ background: '#F0F2F7', padding: '0 16px 12px', flexShrink: 0 }}>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B0B8C4" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search expenses…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#FFFFFF', borderRadius: 14, border: 'none',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                  padding: '12px 40px 12px 40px',
                  fontSize: 14, fontWeight: 500, color: '#0A0D14',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              {searchInput && (
                <button onClick={clearSearch} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#B0B8C4', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>✕</button>
              )}
            </div>

            {/* Month nav */}
            {!isSearching && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={() => setViewMonth(m => subMonths(m, 1))}
                  style={{ width: 36, height: 36, borderRadius: 12, background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0A0D14' }}>{format(viewMonth, 'MMMM yyyy')}</span>
                <button
                  onClick={() => setViewMonth(m => addMonths(m, 1))}
                  disabled={isCurrentMonth}
                  style={{ width: 36, height: 36, borderRadius: 12, background: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: 'none', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isCurrentMonth ? 0.3 : 1 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Scrollable list */}
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 80, color: '#B0B8C4', fontSize: 13 }}>Loading…</div>

            ) : expenses.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px 0', gap: 12 }}>
                <span style={{ fontSize: 40 }}>🗓️</span>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#B0B8C4', textAlign: 'center' }}>
                  {isSearching ? `Nothing found for "${query}"` : `No expenses in ${format(viewMonth, 'MMMM yyyy')}`}
                </p>
                {isCurrentMonth && !isSearching && (
                  <button
                    onClick={() => navigate('/expense/new')}
                    style={{ marginTop: 8, background: 'linear-gradient(135deg,#00C2B2,#009E90)', color: '#fff', border: 'none', borderRadius: 14, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Add first expense
                  </button>
                )}
              </div>

            ) : (
              <div style={{ padding: '0 16px' }}>
                {/* Month total */}
                {!isSearching && (
                  <HeroCard style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {format(viewMonth, 'MMMM yyyy')} · {viewMonthCount} expense{viewMonthCount !== 1 ? 's' : ''}
                    </p>
                    <p style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', lineHeight: 1, letterSpacing: '-0.5px' }}>
                      {fmt(viewMonthTotal)}
                    </p>
                    <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                      Avg ₹{viewMonthCount > 0 ? Math.round(viewMonthTotal / viewMonthCount).toLocaleString('en-IN') : 0} per expense
                    </p>
                  </HeroCard>
                )}

                {/* Grouped by date */}
                {Object.entries(grouped).map(([date, items]) => {
                  const dayTotal = items.reduce((s, e) => s + Number(e.amount), 0);
                  return (
                    <div key={date} style={{ marginBottom: 12 }}>
                      {/* Date header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingLeft: 4 }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: '#B0B8C4', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{date}</p>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B8C4' }}>{fmt(dayTotal)}</p>
                      </div>
                      {/* Cards */}
                      <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
                        {items.map((e, i) => e._isBusiness ? (
                          <TransactionRow
                            key={e.id}
                            icon="🏭"
                            iconBg="rgba(124,58,237,0.12)"
                            title={e.title}
                            subtitle={`Business${e.location?.name ? ' · ' + e.location.name : ''}`}
                            amount={fmt(Number(e.amount))}
                            isLast={i === items.length - 1}
                            onClick={() => navigate('/business/expenses')}
                          />
                        ) : (
                          <TransactionRow
                            key={e.id}
                            icon={e.category?.icon || e.title?.[0]?.toUpperCase() || '?'}
                            iconBg={catBg(e.category)}
                            title={e.title}
                            subtitle={`${e.category?.name || ''}${e.paymentType?.name ? ' · ' + e.paymentType.name : ''}`.trim().replace(/^·\s*/, '')}
                            amount={fmt(Number(e.amount))}
                            isIncome={e.isReimbursement}
                            isLast={i === items.length - 1}
                            onClick={() => navigate(`/expense/${e.id}`)}
                          />
                        ))}
                      </SurfaceCard>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}


      {transferringExpense && (
        <TransferExpenseSheet expense={transferringExpense} onClose={() => setTransferringExpense(null)} />
      )}
    </div>
  );
}
