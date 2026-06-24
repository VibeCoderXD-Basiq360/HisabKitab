import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import api from '../../lib/api';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { label, balance, delta } = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 shadow-lg text-xs max-w-[180px]">
      <p className="font-semibold text-gray-800 dark:text-gray-100 mb-0.5 leading-snug">{label}</p>
      <p className={`font-bold text-sm ${delta >= 0 ? 'text-red-500' : 'text-green-600'}`}>
        {delta >= 0 ? '+' : ''}{fmt(delta)}
      </p>
      <p className="text-gray-400 mt-0.5">Balance: {fmt(balance)}</p>
    </div>
  );
}

export default function BalanceHistoryPage() {
  const { t } = useTranslation();
  const { personId } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['balance-history', personId],
    queryFn: () => api.get(`/splits/balance-history/${personId}`).then((r) => r.data),
    staleTime: 30_000,
  });

  const person = data?.person;
  const rawTimeline = data?.timeline || [];

  // Prepend a zero-balance origin point for the chart
  const chartData = rawTimeline.length > 0
    ? [{ date: rawTimeline[0].date, balance: 0, label: 'Start', delta: 0 }, ...rawTimeline]
    : [];

  const currentBalance = rawTimeline.length > 0 ? rawTimeline[rawTimeline.length - 1].balance : 0;
  const maxAbs = Math.max(...chartData.map((p) => Math.abs(p.balance)), 100);

  const lineColor = currentBalance > 50 ? '#ef4444' : currentBalance < -50 ? '#22c55e' : '#6366f1';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={person ? `${person.name} · Balance` : 'Balance History'} showBack />

      <div className="flex-1 pb-8 px-4">
        {isLoading && (
          <div className="flex flex-col gap-4 pt-6 animate-pulse">
            <div className="h-32 bg-white dark:bg-gray-800 rounded-2xl" />
            <div className="h-48 bg-white dark:bg-gray-800 rounded-2xl" />
          </div>
        )}

        {!isLoading && rawTimeline.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
            <p className="text-4xl mb-3">📈</p>
            <p className="text-base font-medium text-gray-700 dark:text-gray-300">No history yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Add expenses with {person?.name || 'this person'} to see balance over time.
            </p>
          </div>
        )}

        {!isLoading && rawTimeline.length > 0 && (
          <div className="flex flex-col gap-4 pt-4">
            {/* Current balance summary */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Current balance</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">with {person?.name}</p>
              </div>
              <div className="text-right">
                {currentBalance > 0 ? (
                  <>
                    <p className="text-2xl font-bold text-red-500">{fmt(currentBalance)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{person?.name} {t('balance.owes_you')}</p>
                  </>
                ) : currentBalance < 0 ? (
                  <>
                    <p className="text-2xl font-bold text-green-600">{fmt(Math.abs(currentBalance))}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t('balance.you_owe')} {person?.name}</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-400">₹0</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">all settled</p>
                  </>
                )}
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl px-2 pt-5 pb-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 mb-3">
                Balance over time
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => format(new Date(d), 'd MMM')}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => `₹${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[-maxAbs * 1.1, maxAbs * 1.1]}
                    width={40}
                  />
                  <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 4" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="stepAfter"
                    dataKey="balance"
                    stroke={lineColor}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center mt-1">
                Positive = {person?.name} {t('balance.owes_you')} · Negative = {t('balance.you_owe')} {person?.name}
              </p>
            </div>

            {/* Event timeline */}
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                All events
              </p>
              <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-gray-700">
                {[...rawTimeline].reverse().map((event, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${event.delta >= 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                      {event.delta >= 0 ? '📤' : '✅'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{event.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {format(new Date(event.date), 'd MMM yyyy')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold ${event.delta >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                        {event.delta >= 0 ? '+' : ''}{fmt(event.delta)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{fmt(event.balance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
