import { useState } from 'react';
import { usePeople } from '../../hooks/usePeople';
import { useSharedTabs } from '../../hooks/useSharedTabs';
import { useTransferExpense } from '../../hooks/useExpenses';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TransferExpenseSheet({ expense, onClose }) {
  const [personId, setPersonId] = useState('');
  const [transferType, setTransferType] = useState('FULL');
  const [customRatio, setCustomRatio] = useState(50);
  const [tabId, setTabId] = useState('');
  const [error, setError] = useState('');

  const { data: people = [] } = usePeople();
  const { data: tabs = [] } = useSharedTabs();
  const transfer = useTransferExpense();

  const activeTabs = tabs.filter((t) => t.status === 'ACTIVE');
  const amount = Number(expense.amount);
  const selectedPerson = people.find((p) => p.id === personId);
  const hasExistingSplit = expense.splits?.some((s) => ['PENDING', 'PAYMENT_REQUESTED'].includes(s.status));

  const theirShare =
    transferType === 'FULL' ? amount
    : transferType === 'SPLIT' ? Math.round((amount / 2) * 100) / 100
    : Math.round(amount * (Math.min(99, Math.max(1, customRatio)) / 100) * 100) / 100;
  const myShare = Math.round((amount - theirShare) * 100) / 100;

  const handleTransfer = async () => {
    if (!personId) { setError('Please select a person'); return; }
    setError('');
    try {
      await transfer.mutateAsync({
        id: expense.id,
        personId,
        transferType,
        customRatio: transferType === 'CUSTOM' ? customRatio : undefined,
        tabId: tabId || undefined,
      });
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || 'Transfer failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-t-2xl max-h-[92vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Transfer Expense</h2>
            <p className="text-xs text-gray-400 mt-0.5">Assign this cost to someone — they'll owe you</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">

          {/* Expense summary chip */}
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: expense.category?.color ? `${expense.category.color}25` : '#f3f4f6' }}
            >
              {expense.category?.icon || '💸'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{expense.title || 'Expense'}</p>
              <p className="text-xs text-gray-400">{expense.category?.name} · {expense.paymentType?.name}</p>
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white shrink-0">{fmt(amount)}</p>
          </div>

          {/* Existing split warning */}
          {hasExistingSplit && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">⚠️</span>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                This expense already has an active split. Transferring will replace it.
              </p>
            </div>
          )}

          {/* Who to transfer to */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Who will owe you?</label>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Select a person…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* How much they owe */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">How much do they owe?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'FULL', label: 'Full amount', sub: 'They owe everything' },
                { key: 'SPLIT', label: 'Split 50 / 50', sub: 'You share equally' },
                { key: 'CUSTOM', label: 'Custom %', sub: 'Set their share' },
              ].map(({ key, label, sub }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTransferType(key)}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border text-center transition-colors ${
                    transferType === key
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-xs font-semibold leading-tight">{label}</span>
                  <span className={`text-[10px] mt-0.5 leading-tight ${transferType === key ? 'text-white/80' : 'text-gray-400'}`}>{sub}</span>
                </button>
              ))}
            </div>

            {/* Custom ratio slider */}
            {transferType === 'CUSTOM' && (
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Their share: <strong className="text-primary-600">{customRatio}%</strong></span>
                  <span>Your share: <strong>{100 - customRatio}%</strong></span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={99}
                  value={customRatio}
                  onChange={(e) => setCustomRatio(Number(e.target.value))}
                  className="w-full accent-primary-500"
                />
              </div>
            )}
          </div>

          {/* Balance impact preview */}
          {personId && (
            <div className={`rounded-xl border px-4 py-3 flex flex-col gap-1 ${
              theirShare === amount
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800'
                : 'bg-primary-50 dark:bg-primary-900/20 border-primary-100 dark:border-primary-800'
            }`}>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">After transfer</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedPerson?.name} owes you
                </span>
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{fmt(theirShare)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Your net expense</span>
                <span className={`text-sm font-bold ${myShare === 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                  {myShare === 0 ? 'Nothing (fully recovered)' : fmt(myShare)}
                </span>
              </div>
              {!selectedPerson?.linkedUserId && (
                <p className="text-[11px] text-gray-400 mt-1">
                  {selectedPerson?.name} is not on the app — the debt will show in your Balances page only.
                </p>
              )}
            </div>
          )}

          {/* Optional tab link */}
          {activeTabs.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Also add to Shared Tab <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <select
                value={tabId}
                onChange={(e) => setTabId(e.target.value)}
                className="min-h-[48px] px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-base text-gray-900 dark:text-white outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Don't link to a tab</option>
                {activeTabs.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {tabId && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  🤝 This will also appear in the tab and update the shared balance.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={handleTransfer}
            disabled={!personId || transfer.isPending}
            className="w-full h-12 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:bg-primary-600 transition-colors"
          >
            {transfer.isPending ? 'Transferring…' : `Transfer ${personId ? fmt(theirShare) : ''}${personId && selectedPerson ? ` to ${selectedPerson.name}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
