import { useState } from 'react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useAnalytics } from '../../hooks/useExpenses';

const now = new Date();

const PERIODS = [
  {
    label: 'This month',
    params: {
      fromDate: startOfMonth(now).toISOString(),
      toDate: endOfMonth(now).toISOString(),
    },
  },
  {
    label: 'Last month',
    params: {
      fromDate: startOfMonth(subMonths(now, 1)).toISOString(),
      toDate: endOfMonth(subMonths(now, 1)).toISOString(),
    },
  },
  {
    label: 'All time',
    params: {},
  },
];

function BreakdownRow({ name, icon, color, total, count, maxTotal }) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  const barColor = color || '#6366f1';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{icon || '💳'}</span>
          <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
          <span className="text-xs text-gray-400 shrink-0">{count} {count === 1 ? 'txn' : 'txns'}</span>
        </div>
        <span className="text-sm font-bold text-gray-900 shrink-0">
          ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

function Section({ title, items, icon, emptyText }) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">{icon} {title}</h2>
        <p className="text-xs text-gray-400 text-center py-4">{emptyText}</p>
      </div>
    );
  }

  const maxTotal = items[0]?.total || 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{icon} {title}</h2>
      <div className="flex flex-col gap-4">
        {items.map((item, i) => (
          <BreakdownRow
            key={item.id || i}
            name={item.name}
            icon={item.icon}
            color={item.color}
            total={item.total}
            count={item.count}
            maxTotal={maxTotal}
          />
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const period = PERIODS[periodIdx];

  const { data, isLoading } = useAnalytics(period.params);

  const total = data?.total || 0;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title="Analytics" />

      {/* Period selector */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex gap-2">
        {PERIODS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => setPeriodIdx(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              periodIdx === i
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 pb-28 flex flex-col gap-4">
        {isLoading && (
          <p className="text-center text-sm text-gray-400 mt-12">Loading…</p>
        )}

        {!isLoading && (
          <>
            {/* Total card */}
            <div className="bg-primary-500 rounded-2xl p-5 text-white shadow-sm">
              <p className="text-xs font-medium opacity-75">{period.label}</p>
              <p className="text-3xl font-bold mt-1">
                ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs opacity-60 mt-1">
                {(data?.byPaymentType?.reduce((s, p) => s + p.count, 0) || 0)} transactions
              </p>
            </div>

            {/* Payment methods */}
            <Section
              title="By Payment Method"
              icon="💳"
              items={data?.byPaymentType}
              emptyText="No expenses in this period"
            />

            {/* Categories */}
            <Section
              title="By Category"
              icon="🗂️"
              items={data?.byCategory}
              emptyText="No expenses in this period"
            />
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
