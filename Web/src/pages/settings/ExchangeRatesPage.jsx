import { useState } from 'react';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useExchangeRates, useUpdateRate, useRefreshRates } from '../../hooks/useExchangeRates';

const CURRENCY_NAMES = {
  THB: 'Thai Baht',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  AED: 'UAE Dirham',
  SGD: 'Singapore Dollar',
  JPY: 'Japanese Yen',
  MYR: 'Malaysian Ringgit',
  CAD: 'Canadian Dollar',
  AUD: 'Australian Dollar',
};

const CURRENCY_FLAGS = {
  THB: '🇹🇭', USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧',
  AED: '🇦🇪', SGD: '🇸🇬', JPY: '🇯🇵', MYR: '🇲🇾',
  CAD: '🇨🇦', AUD: '🇦🇺',
};

function timeAgo(date) {
  if (!date) return null;
  const mins = Math.floor((Date.now() - new Date(date)) / 60000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ExchangeRatesPage() {
  const { data: rates = [], isLoading } = useExchangeRates();
  const updateRate  = useUpdateRate();
  const refreshRates = useRefreshRates();
  const [editing, setEditing] = useState({});
  const [saved, setSaved]     = useState(null);
  const [refreshDone, setRefreshDone] = useState(false);

  // Use the oldest updatedAt to show how fresh the rates are
  const oldestUpdatedAt = rates.length
    ? rates.reduce((oldest, r) => (new Date(r.updatedAt) < new Date(oldest) ? r.updatedAt : oldest), rates[0].updatedAt)
    : null;

  function startEdit(from, current) {
    setEditing((e) => ({ ...e, [from]: String(current) }));
  }

  async function saveRate(from) {
    const val = parseFloat(editing[from]);
    if (!val || val <= 0) return;
    await updateRate.mutateAsync({ from, rate: val });
    setEditing((e) => { const n = { ...e }; delete n[from]; return n; });
    setSaved(from);
    setTimeout(() => setSaved(null), 1500);
  }

  async function handleRefresh() {
    try {
      await refreshRates.mutateAsync();
      setRefreshDone(true);
      setTimeout(() => setRefreshDone(false), 3000);
    } catch {
      // error is shown via refreshRates.isError
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="Exchange Rates" showBack />

      <div className="flex-1 overflow-auto pb-24 p-4 flex flex-col gap-3">

        {/* Info + refresh button */}
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-700 rounded-2xl px-4 py-3 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
              Rates update automatically every 6 hours from live market data. You can also tap a rate to edit it manually.
            </p>
            {oldestUpdatedAt && (
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1">
                Last synced: {timeAgo(oldestUpdatedAt)}
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshRates.isPending}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
              refreshDone
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                : 'bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 active:bg-indigo-200'
            }`}
          >
            {refreshRates.isPending ? (
              <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full" />
            ) : refreshDone ? (
              '✓'
            ) : (
              '↻'
            )}
            {refreshRates.isPending ? 'Syncing…' : refreshDone ? 'Updated!' : 'Sync now'}
          </button>
        </div>

        {refreshRates.isError && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-700 rounded-xl px-4 py-2">
            <p className="text-xs text-red-600 dark:text-red-400">Could not reach rate server. Using saved rates.</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-300 text-sm">Loading…</div>
          ) : (
            rates.map((r) => {
              const isEditing = editing[r.fromCurrency] !== undefined;
              const isSaved   = saved === r.fromCurrency;
              return (
                <div key={r.fromCurrency} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl w-9 text-center">{CURRENCY_FLAGS[r.fromCurrency] || '💱'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{r.fromCurrency}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{CURRENCY_NAMES[r.fromCurrency] || r.fromCurrency}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">1 {r.fromCurrency} =</span>
                    {isEditing ? (
                      <>
                        <span className="text-xs text-gray-500">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.001"
                          value={editing[r.fromCurrency]}
                          onChange={(e) => setEditing((x) => ({ ...x, [r.fromCurrency]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && saveRate(r.fromCurrency)}
                          autoFocus
                          className="w-20 text-sm text-right bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary-300 text-gray-800 dark:text-gray-200"
                        />
                        <button
                          onClick={() => saveRate(r.fromCurrency)}
                          disabled={updateRate.isPending}
                          className="text-xs font-semibold text-primary-600 dark:text-primary-400 px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/30 active:bg-primary-100"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditing((e) => { const n = { ...e }; delete n[r.fromCurrency]; return n; })}
                          className="text-xs text-gray-400 px-1"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(r.fromCurrency, r.rate)}
                        className={`text-sm font-bold px-2 py-1 rounded-lg transition-colors ${
                          isSaved
                            ? 'text-green-600 bg-green-50 dark:bg-green-900/30'
                            : 'text-gray-800 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 active:bg-gray-200'
                        }`}
                      >
                        {isSaved ? '✓ ₹' : '₹'}{Number(r.rate).toFixed(Number(r.rate) < 1 ? 3 : 2)}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="text-xs text-center text-gray-400 dark:text-gray-500 px-4">
          Tap any rate to override it manually. Rates are sourced from the European Central Bank.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
