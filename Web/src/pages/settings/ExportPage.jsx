import { useState } from 'react';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import api from '../../lib/api';

const now = new Date();

const PERIODS = [
  {
    label: 'This month',
    params: { fromDate: startOfMonth(now).toISOString(), toDate: endOfMonth(now).toISOString() },
  },
  {
    label: 'Last month',
    params: {
      fromDate: startOfMonth(subMonths(now, 1)).toISOString(),
      toDate: endOfMonth(subMonths(now, 1)).toISOString(),
    },
  },
  {
    label: '3 months',
    params: { fromDate: startOfMonth(subMonths(now, 2)).toISOString(), toDate: endOfMonth(now).toISOString() },
  },
  { label: 'All time', params: {} },
];

export default function ExportPage() {
  const [periodIdx, setPeriodIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setLoading(true);
    setError('');
    try {
      const { params } = PERIODS[periodIdx];
      const res = await api.get('/expenses/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="Export CSV" showBack />
      <div className="flex-1 pb-24 p-4 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Select period</p>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPeriodIdx(i)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  periodIdx === i
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Columns included</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
            Date · Title · Category · Payment Type · Amount · Note · Paid For · Group
          </p>
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <button
          onClick={handleDownload}
          disabled={loading}
          className="w-full py-3 bg-primary-500 text-white rounded-2xl font-medium text-sm active:opacity-80 disabled:opacity-50"
        >
          {loading ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
