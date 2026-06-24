import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from 'recharts';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useAnalytics, useTrend } from '../../hooks/useExpenses';
import { useBudgets } from '../../hooks/useBudgets';
import { useInsights } from '../../hooks/useInsights';

const now = new Date();

const PERIOD_KEYS = ['this_month', 'last_month', 'months_3', 'all_time'];

const PERIODS = [
  {
    labelKey: 'this_month',
    params: { fromDate: startOfMonth(now).toISOString(), toDate: endOfMonth(now).toISOString() },
    showDaily: true,
  },
  {
    labelKey: 'last_month',
    params: { fromDate: startOfMonth(subMonths(now, 1)).toISOString(), toDate: endOfMonth(subMonths(now, 1)).toISOString() },
    showDaily: true,
  },
  {
    labelKey: 'months_3',
    params: { fromDate: startOfMonth(subMonths(now, 2)).toISOString(), toDate: endOfMonth(now).toISOString() },
    showDaily: false,
  },
  { labelKey: 'all_time', params: {}, showDaily: false },
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
  const { t } = useTranslation();
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
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
          {count !== 1 ? t('analytics.txn_other', { n: count }) : t('analytics.txn_one', { n: count })}
        </span>
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
                ? t('analytics.over_budget', { amount: fmt(budget.spent - budget.limit) })
                : t('analytics.budget_left', { amount: fmt(budget.limit - budget.spent) })}
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
  const [shareToast, setShareToast] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isCustom = periodIdx === CUSTOM_IDX;
  const customReady = isCustom && customFrom && customTo;
  const period = isCustom
    ? { labelKey: 'custom', label: t('analytics.custom'), params: customReady ? { fromDate: new Date(customFrom).toISOString(), toDate: new Date(customTo + 'T23:59:59').toISOString() } : {}, showDaily: false }
    : { ...PERIODS[periodIdx], label: t(`analytics.${PERIODS[periodIdx].labelKey}`) };

  const { data, isLoading } = useAnalytics(period.params, { enabled: !isCustom || customReady });
  const { data: trendData } = useTrend();
  const { data: budgets = [] } = useBudgets();
  const { data: insights = [] } = useInsights();

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

  async function handleShare() {
    const lines = [
      `💸 HisabKitab — ${period.label}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `Total Spent: ${fmt(total)}`,
      `Transactions: ${txnCount}`,
    ];
    if (avgPerDay > 0) lines.push(`Avg per day: ${fmtK(avgPerDay)}`);
    if (comparison && comparison.prev > 0) {
      const pct = Math.round(((comparison.curr - comparison.prev) / comparison.prev) * 100);
      lines.push(`${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs ${comparison.label}`);
    }
    if (data?.byCategory?.length > 0) {
      lines.push('');
      lines.push('Top categories:');
      data.byCategory.slice(0, 5).forEach((c) => {
        const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
        lines.push(`  ${c.icon || '•'} ${c.name}: ${fmt(c.total)} (${pct}%)`);
      });
    }
    lines.push('');
    lines.push('Tracked with HisabKitab 📊');
    const text = lines.join('\n');

    if (navigator.share) {
      try { await navigator.share({ text }); } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setShareToast('Copied to clipboard!');
        setTimeout(() => setShareToast(''), 2500);
      } catch (_) {}
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('analytics.title')} showBack />

      {/* Period selector */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-4 pt-2 pb-2 sticky top-0 z-10">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {PERIODS.map((p, i) => (
            <button
              key={p.labelKey}
              onClick={() => setPeriodIdx(i)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                periodIdx === i ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {t(`analytics.${p.labelKey}`)}
            </button>
          ))}
          <button
            onClick={() => setPeriodIdx(CUSTOM_IDX)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
              isCustom ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {t('analytics.custom')}
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
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('analytics.trend')}</p>
            {trendData && (
              <p className="text-xs text-gray-400">
                {t('analytics.total', { amount: fmt(trendData.reduce((s, m) => s + m.total, 0)) })}
              </p>
            )}
          </div>
          {!trendData ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('common.loading')}</p>
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
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">{t('common.loading')}</p>
        ) : (
          <>
            {/* Hero summary */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white shadow-sm">
              <div className="flex items-start justify-between mb-1">
                <p className="text-xs font-medium opacity-70">{period.label}</p>
                <div className="flex items-center gap-2">
                  {comparison && comparison.prev > 0 && (
                    <ChangeBadge curr={comparison.curr} prev={comparison.prev} label={comparison.label} />
                  )}
                  {total > 0 && (
                    <button
                      onClick={handleShare}
                      className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm hover:bg-white/30 transition-colors"
                      title="Share summary"
                    >
                      📤
                    </button>
                  )}
                </div>
              </div>
              <p className="text-4xl font-bold tracking-tight mt-1">{fmt(total)}</p>
              <div className="flex items-center gap-4 mt-3 opacity-80">
                <p className="text-xs">{t('analytics.transactions', { n: txnCount })}</p>
                <p className="text-xs">·</p>
                <p className="text-xs">{t('analytics.avg_txn', { amount: fmt(avgPerTxn) })}</p>
              </div>
            </div>

            {/* 3-stat row */}
            <div className="flex gap-3">
              <StatMini
                icon={topCategory?.icon || '🗂️'}
                label={t('analytics.top_category')}
                value={topCategory?.name || '—'}
                sub={topCategory ? fmt(topCategory.total) : null}
              />
              <StatMini
                icon="🔝"
                label={t('analytics.biggest')}
                value={topExpense ? fmt(topExpense.amount) : '—'}
                sub={topExpense?.title || topExpense?.category?.name || null}
              />
              <StatMini
                icon="📅"
                label={t('analytics.avg_day')}
                value={avgPerDay > 0 ? fmtK(avgPerDay) : '—'}
                sub={period.labelKey !== 'all_time' ? period.label : null}
              />
            </div>

            {/* Spending insights — only for This Month */}
            {periodIdx === 0 && insights.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">💡 Spending Insights</h2>
                <div className="flex flex-col gap-2.5">
                  {insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 mt-0.5">{ins.icon}</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{ins.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Source breakdown — manual vs tab vs reimbursements */}
            {data?.bySource && (data.bySource.tab > 0 || data.bySource.reimbursements > 0) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">🤝 {t('analytics.by_source')}</h2>
                <div className="flex flex-col gap-3">
                  {[
                    { label: t('analytics.source_manual'), value: data.bySource.manual, color: '#6366f1', icon: '✏️' },
                    { label: t('analytics.source_tab'), value: data.bySource.tab, color: '#0d9488', icon: '🤝' },
                    { label: t('analytics.source_reimbursements'), value: data.bySource.reimbursements, color: '#22c55e', icon: '↩' },
                  ].filter((r) => r.value > 0).map((row) => {
                    const gross = data.bySource.manual + data.bySource.tab;
                    const pct = gross > 0 ? Math.round((row.value / gross) * 100) : 0;
                    return (
                      <div key={row.label} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base shrink-0">{row.icon}</span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{row.label}</span>
                          {row.icon !== '↩' && <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{pct}%</span>}
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {row.icon === '↩' ? `−${fmt(row.value)}` : fmt(row.value)}
                          </span>
                        </div>
                        {row.icon !== '↩' && (
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-2 mt-1 flex justify-between items-center">
                    <span className="text-xs text-gray-400 dark:text-gray-500">{t('analytics.source_net')}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {fmt(data.bySource.manual + data.bySource.tab - data.bySource.reimbursements)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Daily spend chart */}
            {period.showDaily && dailyData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">{t('analytics.daily_spend')}</p>
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
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">🗂️ {t('analytics.by_category')}</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('analytics.tap_see')}</p>
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
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">💳 {t('analytics.by_payment')}</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('analytics.tap_see')}</p>
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
                <p className="text-sm text-gray-400">{t('analytics.no_expenses')}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Net worth entry point */}
      <div className="mx-4 mb-2">
        <button
          onClick={() => navigate('/net-worth')}
          className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💎</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Net Worth Dashboard</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Assets · Liabilities · Snapshot</p>
            </div>
          </div>
          <span className="text-gray-400 text-sm">→</span>
        </button>
      </div>

      {shareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none animate-fade-in">
          {shareToast}
        </div>
      )}
      <BottomNav />
    </div>
  );
}
