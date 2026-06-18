import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from 'recharts';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useAnalytics, useTrend } from '../../hooks/useExpenses';
import { useBudgets } from '../../hooks/useBudgets';

const now = new Date();

const PERIODS = [
  {
    label: 'This month',
    params: { fromDate: startOfMonth(now).toISOString(), toDate: endOfMonth(now).toISOString() },
    showDaily: true,
  },
  {
    label: 'Last month',
    params: { fromDate: startOfMonth(subMonths(now, 1)).toISOString(), toDate: endOfMonth(subMonths(now, 1)).toISOString() },
    showDaily: true,
  },
  {
    label: '3 months',
    params: { fromDate: startOfMonth(subMonths(now, 2)).toISOString(), toDate: endOfMonth(now).toISOString() },
    showDaily: false,
  },
  { label: 'All time', params: {}, showDaily: false },
];

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtK = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
};

function barProgressColor(pct) {
  if (pct >= 100) return '#ef4444';
  if (pct >= 80) return '#facc15';
  return '#22c55e';
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl shadow-lg px-3 py-2 border border-gray-100">
      <p className="text-xs text-gray-400">{d?.fullMonth}</p>
      <p className="text-sm font-bold text-gray-900">{fmt(d?.total)}</p>
      <p className="text-xs text-gray-400">{d?.count} txns</p>
    </div>
  );
}

function DailyTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl shadow-lg px-3 py-2 border border-gray-100">
      <p className="text-xs text-gray-400">{d?.label}</p>
      <p className="text-sm font-bold text-gray-900">{fmt(d?.total)}</p>
    </div>
  );
}

function getComparison(periodIdx, trendData) {
  if (!trendData || trendData.length < 6) return null;
  switch (periodIdx) {
    case 0: return { curr: trendData[5]?.total || 0, prev: trendData[4]?.total || 0, label: trendData[4]?.fullMonth };
    case 1: return { curr: trendData[4]?.total || 0, prev: trendData[3]?.total || 0, label: trendData[3]?.fullMonth };
    case 2: {
      const curr = trendData.slice(3).reduce((s, m) => s + m.total, 0);
      const prev = trendData.slice(0, 3).reduce((s, m) => s + m.total, 0);
      return { curr, prev, label: 'prev 3 months' };
    }
    default: return null;
  }
}

function ChangeBadge({ curr, prev, label }) {
  if (!prev) return null;
  const pct = Math.round(((curr - prev) / prev) * 100);
  const up = pct > 0;
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${up ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
      <span>{up ? '▲' : '▼'}</span>
      <span>{Math.abs(pct)}% vs {label}</span>
    </div>
  );
}

function StatMini({ icon, label, value, sub }) {
  return (
    <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-3 flex flex-col gap-1 shadow-sm min-w-0">
      <span className="text-lg">{icon}</span>
      <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight truncate">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{sub}</p>}
    </div>
  );
}

function BreakdownRow({ name, icon, color, total, count, grandTotal, onClick, budget }) {
  const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
  const barColor = color || '#6366f1';
  const Tag = onClick ? 'button' : 'div';

  const budgetOver = budget && budget.pct >= 100;
  const budgetWarn = budget && !budgetOver && budget.pct >= 80;

  return (
    <Tag onClick={onClick} className={`flex flex-col gap-1.5 w-full text-left ${onClick ? 'active:opacity-60' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-base shrink-0">{icon || '💳'}</span>
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">{name}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{count} txn{count !== 1 ? 's' : ''}</span>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0 w-8 text-right">{pct}%</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">{fmt(total)}</span>
        {onClick && <span className="text-gray-300 dark:text-gray-600 text-base shrink-0">›</span>}
      </div>

      {/* Spend share bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>

      {/* Budget bar — only when limit is set */}
      {budget && (
        <div className="mt-0.5 pl-6">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-xs font-medium flex items-center gap-1 ${budgetOver ? 'text-red-500' : budgetWarn ? 'text-yellow-500' : 'text-green-600'}`}>
              💰 {budget.pct}% of {fmt(budget.limit)} budget
            </span>
            <span className={`text-xs font-semibold ${budgetOver ? 'text-red-500' : 'text-gray-400'}`}>
              {budgetOver
                ? `+${fmt(budget.spent - budget.limit)} over`
                : `${fmt(budget.limit - budget.spent)} left`}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(budget.pct, 100)}%`, backgroundColor: barProgressColor(budget.pct) }}
            />
          </div>
        </div>
      )}
    </Tag>
  );
}

const CUSTOM_IDX = PERIODS.length;

export default function AnalyticsPage() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const navigate = useNavigate();

  const isCustom = periodIdx === CUSTOM_IDX;
  const customReady = isCustom && customFrom && customTo;
  const period = isCustom
    ? { label: 'Custom', params: customReady ? { fromDate: new Date(customFrom).toISOString(), toDate: new Date(customTo + 'T23:59:59').toISOString() } : {}, showDaily: false }
    : PERIODS[periodIdx];

  const { data, isLoading } = useAnalytics(period.params, { enabled: !isCustom || customReady });
  const { data: trendData } = useTrend();
  const { data: budgets = [] } = useBudgets();

  const comparison = useMemo(() => getComparison(periodIdx, trendData), [periodIdx, trendData]);

  const total = data?.total || 0;
  const txnCount = data?.transactionCount || 0;
  const avgPerTxn = data?.avgPerTransaction || 0;
  const avgPerDay = data?.avgPerDay || 0;
  const topCategory = data?.byCategory?.[0];
  const topExpense = data?.topExpense;

  // Build spend map from analytics for the selected period
  const spendMap = useMemo(() => {
    const map = {};
    (data?.byCategory || []).forEach((c) => { if (c.id) map[c.id] = c.total; });
    return map;
  }, [data]);

  // Budget per category — only for monthly periods (This month / Last month)
  const budgetByCategory = useMemo(() => {
    if (periodIdx > 1 || isCustom) return {};
    const map = {};
    budgets.filter((b) => b.budget).forEach((b) => {
      map[b.categoryId] = {
        pct: Math.round(((spendMap[b.categoryId] || 0) / b.budget.amount) * 100),
        spent: spendMap[b.categoryId] || 0,
        limit: b.budget.amount,
      };
    });
    return map;
  }, [budgets, spendMap, periodIdx]);

  const dailyData = useMemo(() => {
    if (!period.showDaily || !period.params.fromDate || !data?.byDay) return [];
    const dayMap = Object.fromEntries((data.byDay || []).map((d) => [d.date, d.total]));
    const days = eachDayOfInterval({
      start: parseISO(period.params.fromDate),
      end: period.params.toDate ? parseISO(period.params.toDate) : now,
    });
    return days.map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      return { date: key, day: d.getDate(), label: format(d, 'd MMM'), total: dayMap[key] || 0 };
    });
  }, [data, period]);

  const buildQS = () => {
    const qs = new URLSearchParams();
    if (period.params.fromDate) qs.set('fromDate', period.params.fromDate);
    if (period.params.toDate) qs.set('toDate', period.params.toDate);
    qs.set('period', period.label);
    return qs.toString();
  };

  const handleCategoryClick = (cat) => {
    if (!cat.id) return;
    navigate(`/analytics/category/${cat.id}?${buildQS()}`);
  };

  const handlePaymentClick = (pt) => {
    if (!pt.id) return;
    navigate(`/analytics/payment/${pt.id}?${buildQS()}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="Analytics" />

      {/* Period selector */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 pt-2 pb-2 sticky top-0 z-10">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriodIdx(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                periodIdx === i ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setPeriodIdx(CUSTOM_IDX)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              isCustom ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            Custom
          </button>
        </div>
        {isCustom && (
          <div className="flex gap-2 mt-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="flex-1 text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary-400"
            />
            <span className="text-xs text-gray-400 dark:text-gray-500 self-center">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="flex-1 text-xs border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-primary-400"
            />
          </div>
        )}
      </div>

      <div className="flex-1 p-4 pb-28 flex flex-col gap-4">

        {/* 6-Month Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">6-Month Trend</p>
            {trendData && (
              <p className="text-xs text-gray-400">
                Total: {fmt(trendData.reduce((s, m) => s + m.total, 0))}
              </p>
            )}
          </div>
          {!trendData ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">Loading…</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trendData} barCategoryGap="25%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis hide />
                <Tooltip content={<TrendTooltip />} cursor={{ fill: '#f3f4f6', radius: 6 }} />
                <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                  {trendData.map((entry, i) => (
                    <Cell key={i} fill={entry.isCurrent ? '#6366f1' : '#e0e7ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {isLoading ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">Loading…</p>
        ) : (
          <>
            {/* Hero summary */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white shadow-sm">
              <div className="flex items-start justify-between mb-1">
                <p className="text-xs font-medium opacity-70">{period.label}</p>
                {comparison && comparison.prev > 0 && (
                  <ChangeBadge curr={comparison.curr} prev={comparison.prev} label={comparison.label} />
                )}
              </div>
              <p className="text-4xl font-bold tracking-tight mt-1">{fmt(total)}</p>
              <div className="flex items-center gap-4 mt-3 opacity-80">
                <p className="text-xs">{txnCount} transactions</p>
                <p className="text-xs">·</p>
                <p className="text-xs">avg {fmt(avgPerTxn)} / txn</p>
              </div>
            </div>

            {/* 3-stat row */}
            <div className="flex gap-3">
              <StatMini
                icon={topCategory?.icon || '🗂️'}
                label="Top category"
                value={topCategory?.name || '—'}
                sub={topCategory ? fmt(topCategory.total) : null}
              />
              <StatMini
                icon="🔝"
                label="Biggest expense"
                value={topExpense ? fmt(topExpense.amount) : '—'}
                sub={topExpense?.title || topExpense?.category?.name || null}
              />
              <StatMini
                icon="📅"
                label="Avg per day"
                value={avgPerDay > 0 ? fmtK(avgPerDay) : '—'}
                sub={period.label !== 'All time' ? period.label : null}
              />
            </div>

            {/* Daily spend chart */}
            {period.showDaily && dailyData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Daily Spend</p>
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={dailyData} barCategoryGap="20%" margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#d1d5db' }} interval={4} />
                    <Tooltip content={<DailyTooltip />} cursor={{ fill: '#f9fafb', radius: 4 }} />
                    <Bar dataKey="total" fill="#c7d2fe" radius={[3, 3, 0, 0]} activeBar={{ fill: '#6366f1' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Category breakdown */}
            {data?.byCategory?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">🗂️ By Category</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Tap to see expenses</p>
                </div>
                <div className="flex flex-col gap-4">
                  {data.byCategory.map((item, i) => (
                    <BreakdownRow
                      key={item.id || i}
                      name={item.name}
                      icon={item.icon}
                      color={item.color}
                      total={item.total}
                      count={item.count}
                      grandTotal={total}
                      budget={item.id ? budgetByCategory[item.id] : undefined}
                      onClick={item.id ? () => handleCategoryClick(item) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Payment method breakdown */}
            {data?.byPaymentType?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">💳 By Payment Method</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Tap to see expenses</p>
                </div>
                <div className="flex flex-col gap-4">
                  {data.byPaymentType.map((item, i) => (
                    <BreakdownRow
                      key={item.id || i}
                      name={item.name}
                      icon={item.icon}
                      color={item.color}
                      total={item.total}
                      count={item.count}
                      grandTotal={total}
                      onClick={item.id ? () => handlePaymentClick(item) : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {!data?.byCategory?.length && !data?.byPaymentType?.length && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-5xl">📊</span>
                <p className="text-sm text-gray-400">No expenses in this period</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
