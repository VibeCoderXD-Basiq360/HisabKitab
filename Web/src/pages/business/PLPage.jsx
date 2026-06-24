import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessPL } from '../../hooks/useBusiness';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';

const fmt = n => `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-IN')}`;
const pct = n => `${Math.round(Number(n) || 0)}%`;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

function Row({ label, value, sub, accent, bold }) {
  return (
    <div className={`flex justify-between items-baseline py-2 border-b border-gray-50 dark:border-gray-700 last:border-0 ${bold ? 'font-bold' : ''}`}>
      <span className={`text-sm ${sub ? 'text-gray-400 pl-3' : 'text-gray-700 dark:text-gray-200'}`}>{label}</span>
      <span className={`text-sm font-semibold ${accent || 'text-gray-900 dark:text-white'}`}>{value}</span>
    </div>
  );
}

export default function PLPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: pl, isLoading } = useBusinessPL({ month, year });

  function shift(delta) {
    let m = month + delta, y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
  }

  const catColors = ['bg-primary-500','bg-blue-500','bg-purple-500','bg-green-500','bg-yellow-500','bg-red-500','bg-pink-500'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      <TopBar title="P&amp;L Report" onBack={() => navigate('/business')} />

      <div className="px-4 pt-4 space-y-4">
        {/* Month picker */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm">
          <button onClick={() => shift(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 font-bold">‹</button>
          <p className="font-bold text-gray-900 dark:text-white">{MONTHS[month - 1]} {year}</p>
          <button onClick={() => shift(1)} disabled={year === now.getFullYear() && month === now.getMonth() + 1}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-500 font-bold disabled:opacity-40">›</button>
        </div>

        {isLoading && <p className="text-center text-gray-400 py-10">Loading…</p>}

        {pl && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Revenue', value: fmt(pl.revenue), color: 'text-green-600 dark:text-green-400' },
                { label: 'Gross Profit', value: fmt(pl.grossProfit), color: Number(pl.grossProfit) >= 0 ? 'text-green-600' : 'text-red-500' },
                { label: 'Operating Expenses', value: fmt(pl.opExpenses), color: 'text-red-500' },
                { label: 'Net Profit', value: fmt(pl.netProfit), color: Number(pl.netProfit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500' },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* P&L Statement */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Income Statement</p>
              <Row label="Revenue" value={fmt(pl.revenue)} accent="text-green-600" />
              <Row label="Cost of Goods Sold" value={`(${fmt(pl.cogs)})`} accent="text-red-500" sub />
              <Row label="Gross Profit" value={fmt(pl.grossProfit)} bold accent={Number(pl.grossProfit) >= 0 ? 'text-green-600' : 'text-red-500'} />
              <Row label="Operating Expenses" value={`(${fmt(pl.opExpenses)})`} accent="text-red-500" sub />
              <Row label="Net Profit" value={fmt(pl.netProfit)} bold accent={Number(pl.netProfit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'} />
              {pl.netProfit !== undefined && pl.revenue > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-50 dark:border-gray-700 flex justify-between text-sm">
                  <span className="text-gray-400">Net margin</span>
                  <span className={`font-bold ${Number(pl.netProfit) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {pct((Number(pl.netProfit) / Number(pl.revenue)) * 100)}
                  </span>
                </div>
              )}
            </div>

            {/* Job stats */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Job Stats</p>
              <Row label="Total jobs" value={pl.jobCount || 0} />
              <Row label="Avg. charged" value={fmt(pl.avgChargedPrice)} />
              <Row label="Avg. margin" value={pct(pl.avgMarginPct)} />
            </div>

            {/* Cost breakdown */}
            {pl.costBreakdown && pl.costBreakdown.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Expense Breakdown</p>
                {pl.costBreakdown.map((cat, i) => {
                  const total = pl.costBreakdown.reduce((s, c) => s + Number(c.amount), 0);
                  const widthPct = total > 0 ? Math.round((Number(cat.amount) / total) * 100) : 0;
                  return (
                    <div key={cat.category} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-200">{cat.category}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{fmt(cat.amount)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${catColors[i % catColors.length]}`} style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Partner splits */}
            {pl.partnerSplits && pl.partnerSplits.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Partner Splits (Net Profit)</p>
                {pl.partnerSplits.map(p => (
                  <div key={p.name} className="flex justify-between items-baseline py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <span className="text-sm text-gray-700 dark:text-gray-200">{p.name} ({pct(p.sharePct)})</span>
                    <span className={`text-sm font-bold ${Number(p.amount) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
