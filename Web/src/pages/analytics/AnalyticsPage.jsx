import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from 'recharts';
import TopBar from '../../components/TopBar';
import { useAnalytics, useTrend } from '../../hooks/useExpenses';
import { useBudgets } from '../../hooks/useBudgets';
import { useInsights } from '../../hooks/useInsights';
import HeroCard from '../../components/ui/HeroCard';
import SurfaceCard from '../../components/ui/SurfaceCard';
import ProgressBar from '../../components/ui/ProgressBar';

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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      color: up ? '#E11D48' : '#059669',
      background: up ? 'rgba(225,29,72,0.15)' : 'rgba(5,150,105,0.15)',
    }}>
      <span>{up ? '▲' : '▼'}</span>
      <span>{Math.abs(pct)}% vs {label}</span>
    </div>
  );
}

function StatMini({ icon, label, value, sub }) {
  return (
    <div style={{
      flex: 1,
      background: '#fff',
      borderRadius: 16,
      padding: 14,
      boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span className="text-lg">{icon}</span>
      <p style={{ color: '#B0B8C4', fontSize: 12, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
      <p style={{ color: '#0A0D14', fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
      {sub && <p style={{ color: '#B0B8C4', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>}
    </div>
  );
}

function BreakdownRow({ name, icon, color, total, count, grandTotal, onClick, budget }) {
  const { t } = useTranslation();
  const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
  const barColor = color || '#00C2B2';
  const Tag = onClick ? 'button' : 'div';

  const budgetOver = budget && budget.pct >= 100;
  const budgetWarn = budget && !budgetOver && budget.pct >= 80;

  return (
    <Tag onClick={onClick} className={`flex flex-col gap-1.5 w-full text-left ${onClick ? 'active:opacity-60' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-base shrink-0">{icon || '💳'}</span>
        <span style={{ color: '#0A0D14', fontSize: 14, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ color: '#B0B8C4', fontSize: 12, flexShrink: 0 }}>
          {count !== 1 ? t('analytics.txn_other', { n: count }) : t('analytics.txn_one', { n: count })}
        </span>
        <span style={{ color: '#B0B8C4', fontSize: 12, fontWeight: 600, flexShrink: 0, width: 32, textAlign: 'right' }}>{pct}%</span>
        <span style={{ color: '#0A0D14', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{fmt(total)}</span>
        {onClick && <span style={{ color: '#B0B8C4', fontSize: 16, flexShrink: 0 }}>›</span>}
      </div>

      {/* Spend share bar */}
      <div style={{ height: 6, borderRadius: 3, background: '#F0F2F7', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3 }} />
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
          <ProgressBar pct={budget.pct} height={5} />
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
      `────────────────────`,
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title="Analytics" />

      {/* Period selector */}
      <div style={{ background: '#F0F2F7', padding: '8px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {PERIODS.map((p, i) => (
            <button
              key={p.labelKey}
              onClick={() => setPeriodIdx(i)}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                background: periodIdx === i ? '#00C2B2' : '#E9ECF0',
                color: periodIdx === i ? '#fff' : '#B0B8C4',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {t(`analytics.${p.labelKey}`)}
            </button>
          ))}
          <button
            onClick={() => setPeriodIdx(CUSTOM_IDX)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              background: isCustom ? '#00C2B2' : '#E9ECF0',
              color: isCustom ? '#fff' : '#B0B8C4',
              transition: 'background 0.15s, color 0.15s',
            }}
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
              style={{ flex: 1, fontSize: 13, background: '#fff', border: '1.5px solid #E9ECF0', borderRadius: 12, padding: '10px 12px', outline: 'none' }}
            />
            <span style={{ fontSize: 12, color: '#B0B8C4', alignSelf: 'center' }}>to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              style={{ flex: 1, fontSize: 13, background: '#fff', border: '1.5px solid #E9ECF0', borderRadius: 12, padding: '10px 12px', outline: 'none' }}
            />
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: '0 16px', paddingTop: 12, paddingBottom: 'calc(100px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* 6-Month Trend */}
        <SurfaceCard>
          <div className="flex items-center justify-between mb-4">
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14' }}>{t('analytics.trend')}</p>
            {trendData && (
              <p className="text-xs text-gray-400">
                {t('analytics.total', { amount: fmt(trendData.reduce((s, m) => s + m.total, 0)) })}
              </p>
            )}
          </div>
          {!trendData ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-xs text-gray-400">{t('common.loading')}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={trendData} barCategoryGap="25%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis hide />
                <Tooltip content={<TrendTooltip />} cursor={{ fill: '#f3f4f6', radius: 6 }} />
                <Bar dataKey="total" radius={[5, 5, 0, 0]}>
                  {trendData.map((entry, i) => (
                    <Cell key={i} fill={entry.isCurrent ? '#00C2B2' : 'rgba(0,194,178,0.18)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </SurfaceCard>

        {isLoading ? (
          <p style={{ textAlign: 'center', fontSize: 14, color: '#B0B8C4', padding: '32px 0' }}>{t('common.loading')}</p>
        ) : (
          <>
            {/* Hero summary */}
            <HeroCard>
              <div className="flex items-start justify-between mb-1">
                <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{period.label}</p>
                <div className="flex items-center gap-2">
                  {comparison && comparison.prev > 0 && (
                    <ChangeBadge curr={comparison.curr} prev={comparison.prev} label={comparison.label} />
                  )}
                  {total > 0 && (
                    <button
                      onClick={handleShare}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors"
                      style={{ background: 'rgba(255,255,255,0.2)' }}
                      title="Share summary"
                    >
                      📤
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 34, fontWeight: 800, color: '#fff', marginTop: 4 }}>{fmt(total)}</p>
              <div className="flex items-center gap-4 mt-3" style={{ opacity: 0.8 }}>
                <p className="text-xs text-white">{t('analytics.transactions', { n: txnCount })}</p>
                <p className="text-xs text-white">·</p>
                <p className="text-xs text-white">{t('analytics.avg_txn', { amount: fmt(avgPerTxn) })}</p>
              </div>
            </HeroCard>

            {/* 3-stat row */}
            <div className="flex gap-3">
              <StatMini
                icon={topCategory?.icon || '🗂️'}
                label={t('analytics.top_category')}
                value={topCategory?.name || '—'}
                sub={topCategory ? fmt(topCategory.total) : null}
              />
              <StatMini
                icon="🔔"
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
              <SurfaceCard>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14', marginBottom: 12 }}>💡 Spending Insights</h2>
                <div className="flex flex-col gap-2.5">
                  {insights.map((ins, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-base shrink-0 mt-0.5">{ins.icon}</span>
                      <p style={{ fontSize: 12, color: '#0A0D14', lineHeight: 1.6 }}>{ins.message}</p>
                    </div>
                  ))}
                </div>
              </SurfaceCard>
            )}

            {/* Source breakdown — manual vs tab vs reimbursements */}
            {data?.bySource && (data.bySource.tab > 0 || data.bySource.reimbursements > 0) && (
              <SurfaceCard>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14', marginBottom: 12 }}>🤝 {t('analytics.by_source')}</h2>
                <div className="flex flex-col gap-3">
                  {[
                    { label: t('analytics.source_manual'), value: data.bySource.manual, color: '#00C2B2', icon: '✏️' },
                    { label: t('analytics.source_tab'), value: data.bySource.tab, color: '#6366F1', icon: '🤝' },
                    { label: t('analytics.source_reimbursements'), value: data.bySource.reimbursements, color: '#22c55e', icon: '↩' },
                  ].filter((r) => r.value > 0).map((row) => {
                    const gross = data.bySource.manual + data.bySource.tab;
                    const pct = gross > 0 ? Math.round((row.value / gross) * 100) : 0;
                    return (
                      <div key={row.label} className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base shrink-0">{row.icon}</span>
                          <span style={{ fontSize: 14, fontWeight: 500, color: '#0A0D14', flex: 1 }}>{row.label}</span>
                          {row.icon !== '↩' && <span style={{ fontSize: 12, fontWeight: 600, color: '#B0B8C4', flexShrink: 0 }}>{pct}%</span>}
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14', flexShrink: 0 }}>
                            {row.icon === '↩' ? `−${fmt(row.value)}` : fmt(row.value)}
                          </span>
                        </div>
                        {row.icon !== '↩' && (
                          <div style={{ height: 6, borderRadius: 3, background: '#F0F2F7', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: row.color, borderRadius: 3, transition: 'width 0.7s' }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ borderTop: '1px solid #F0F2F7', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#B0B8C4' }}>{t('analytics.source_net')}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0D14' }}>
                      {fmt(data.bySource.manual + data.bySource.tab - data.bySource.reimbursements)}
                    </span>
                  </div>
                </div>
              </SurfaceCard>
            )}

            {/* Daily spend chart */}
            {period.showDaily && dailyData.length > 0 && (
              <SurfaceCard>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14', marginBottom: 12 }}>{t('analytics.daily_spend')}</p>
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={dailyData} barCategoryGap="20%" margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#d1d5db' }} interval={4} />
                    <Tooltip content={<DailyTooltip />} cursor={{ fill: '#f9fafb', radius: 4 }} />
                    <Bar dataKey="total" fill="rgba(0,194,178,0.25)" radius={[3, 3, 0, 0]} activeBar={{ fill: '#00C2B2' }} />
                  </BarChart>
                </ResponsiveContainer>
              </SurfaceCard>
            )}

            {/* Category breakdown */}
            {data?.byCategory?.length > 0 && (
              <SurfaceCard>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14' }}>🗂️ {t('analytics.by_category')}</h2>
                  <p style={{ fontSize: 12, color: '#B0B8C4' }}>{t('analytics.tap_see')}</p>
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
              </SurfaceCard>
            )}

            {/* Payment method breakdown */}
            {data?.byPaymentType?.length > 0 && (
              <SurfaceCard>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0A0D14' }}>💳 {t('analytics.by_payment')}</h2>
                  <p style={{ fontSize: 12, color: '#B0B8C4' }}>{t('analytics.tap_see')}</p>
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
              </SurfaceCard>
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


      {shareToast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 text-sm font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none animate-fade-in"
          style={{ background: '#0A0D14', color: '#fff' }}
        >
          {shareToast}
        </div>
      )}
    </div>
  );
}
