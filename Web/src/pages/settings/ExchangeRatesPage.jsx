import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
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
  const { t } = useTranslation();
  const { data: rates = [], isLoading } = useExchangeRates();
  const updateRate   = useUpdateRate();
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar title={t('settings.exchange_rates')} showBack />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>

        {/* Info + refresh button */}
        <SurfaceCard style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: '#374151', fontWeight: 500, margin: 0 }}>
                Rates update automatically every 6 hours from live market data. You can also tap a rate to edit it manually.
              </p>
              {oldestUpdatedAt && (
                <p style={{ fontSize: 11, color: '#B0B8C4', marginTop: 4, marginBottom: 0 }}>
                  Last synced: {timeAgo(oldestUpdatedAt)}
                </p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshRates.isPending}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                padding: '8px 14px',
                background: refreshDone ? '#D1FAE5' : '#E6FAF9',
                color: refreshDone ? '#059669' : '#009E90',
                border: 'none',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {refreshRates.isPending ? (
                <span style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  border: '2px solid #00C2B2',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : refreshDone ? (
                '✓'
              ) : (
                '↻'
              )}
              {refreshRates.isPending ? 'Syncing…' : refreshDone ? 'Updated!' : 'Sync now'}
            </button>
          </div>
        </SurfaceCard>

        {refreshRates.isError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '8px 16px' }}>
            <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>Could not reach rate server. Using saved rates.</p>
          </div>
        )}

        <SurfaceCard style={{ padding: 0, overflow: 'hidden' }}>
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', gap: 10 }}>
              <span style={{
                display: 'inline-block',
                width: 20,
                height: 20,
                border: '2px solid #E6FAF9',
                borderTop: '3px solid #00C2B2',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              <span style={{ fontSize: 13, color: '#B0B8C4' }}>{t('common.loading')}</span>
            </div>
          ) : (
            rates.map((r, idx) => {
              const isEditing = editing[r.fromCurrency] !== undefined;
              const isSaved   = saved === r.fromCurrency;
              return (
                <div
                  key={r.fromCurrency}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderBottom: idx < rates.length - 1 ? '1px solid #F0F2F7' : 'none',
                    background: '#fff',
                  }}
                >
                  <span style={{ fontSize: 22, width: 36, textAlign: 'center' }}>{CURRENCY_FLAGS[r.fromCurrency] || '💱'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#0A0D14', margin: 0 }}>{r.fromCurrency}</p>
                    <p style={{ fontSize: 11, color: '#B0B8C4', margin: 0 }}>{CURRENCY_NAMES[r.fromCurrency] || r.fromCurrency}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#B0B8C4' }}>1 {r.fromCurrency} =</span>
                    {isEditing ? (
                      <>
                        <span style={{ fontSize: 12, color: '#6B7280' }}>₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.001"
                          value={editing[r.fromCurrency]}
                          onChange={(e) => setEditing((x) => ({ ...x, [r.fromCurrency]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && saveRate(r.fromCurrency)}
                          autoFocus
                          style={{
                            width: 80,
                            fontSize: 13,
                            textAlign: 'right',
                            background: '#F0F2F7',
                            border: '1.5px solid #00C2B2',
                            borderRadius: 8,
                            padding: '4px 8px',
                            outline: 'none',
                            color: '#0A0D14',
                          }}
                        />
                        <button
                          onClick={() => saveRate(r.fromCurrency)}
                          disabled={updateRate.isPending}
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#009E90',
                            padding: '4px 10px',
                            borderRadius: 8,
                            background: '#E6FAF9',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {t('common.save')}
                        </button>
                        <button
                          onClick={() => setEditing((e) => { const n = { ...e }; delete n[r.fromCurrency]; return n; })}
                          style={{ fontSize: 12, color: '#B0B8C4', padding: '4px 4px', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(r.fromCurrency, r.rate)}
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: isSaved ? '#059669' : '#00C2B2',
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: isSaved ? '#D1FAE5' : '#E6FAF9',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                      >
                        {isSaved ? '✓ ₹' : '₹'}{Number(r.rate).toFixed(Number(r.rate) < 1 ? 3 : 2)}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </SurfaceCard>

        <p style={{ fontSize: 11, color: '#B0B8C4', textAlign: 'center', padding: '0 16px', margin: 0 }}>
          Tap any rate to override it manually. Rates are sourced from the European Central Bank.
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
