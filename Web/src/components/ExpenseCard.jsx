import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';
import { useRateMap } from '../hooks/useExchangeRates';

export default function ExpenseCard({ expense, onClick, onDelete, onDuplicate }) {
  const navigate = useNavigate();
  const rateMap = useRateMap();
  const isForeign = expense.currency && expense.currency !== 'INR';
  // Prefer the rate frozen at creation time; fall back to current rate for old records
  const rate      = isForeign
    ? (expense.rateAtTime != null ? Number(expense.rateAtTime) : rateMap[expense.currency])
    : null;
  const inrEquiv  = rate ? Number(expense.amount) * rate : null;
  const [swipeX, setSwipeX] = useState(0);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const longPressRef = useRef(null);

  const confirmedSplits = expense.splits?.filter((s) => s.status === 'CONFIRMED') || [];
  const waivedSplits = expense.splits?.filter((s) => s.status === 'WAIVED') || [];
  const pendingSplits = expense.splits?.filter((s) => ['PENDING', 'PAYMENT_REQUESTED'].includes(s.status)) || [];
  const settledAmount = confirmedSplits.reduce((s, sp) => s + Number(sp.amount), 0);
  const currentAmount = Number(expense.amount);
  const isFullySettled = confirmedSplits.length > 0 && pendingSplits.length === 0;
  const isPartiallySettled = confirmedSplits.length > 0 && pendingSplits.length > 0;
  const isReimbursement = !!expense.isReimbursement;

  const settledNames = confirmedSplits.map((s) => s.person?.name).filter(Boolean);
  const settledLabel = settledNames.length === 1
    ? settledNames[0]
    : settledNames.length === 2
      ? `${settledNames[0]} & ${settledNames[1]}`
      : `${settledNames.length} people`;

  const waivedNames = waivedSplits.map((s) => s.person?.name).filter(Boolean);
  const waivedLabel = waivedNames.length === 1
    ? waivedNames[0]
    : waivedNames.length === 2
      ? `${waivedNames[0]} & ${waivedNames[1]}`
      : `${waivedNames.length} people`;

  const DELETE_THRESHOLD = 80;
  const isRevealed = swipeX <= -(DELETE_THRESHOLD - 8);

  function handleTouchStart(e) {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = false;
    if (onDuplicate) {
      longPressRef.current = setTimeout(() => {
        if (!isDraggingRef.current) {
          navigator.vibrate?.(40);
          onDuplicate(expense);
        }
      }, 600);
    }
  }

  function handleTouchMove(e) {
    const dx = e.touches[0].clientX - startXRef.current;
    if (Math.abs(dx) > 8) {
      isDraggingRef.current = true;
      clearTimeout(longPressRef.current);
    }
    if (!onDelete || dx > 0) return;
    setSwipeX(Math.max(dx, -DELETE_THRESHOLD));
  }

  function handleTouchEnd() {
    clearTimeout(longPressRef.current);
    if (swipeX < -40) {
      setSwipeX(-DELETE_THRESHOLD);
    } else {
      setSwipeX(0);
    }
  }

  function handleClick(e) {
    if (isDraggingRef.current || isRevealed) {
      setSwipeX(0);
      return;
    }
    onClick?.(e);
  }

  return (
    <div className="relative overflow-hidden" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {onDelete && (
        <button
          className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex flex-col items-center justify-center gap-0.5 text-white"
          onClick={() => { setSwipeX(0); onDelete(expense.id); }}
        >
          <span className="text-lg">🗑️</span>
          <span className="text-[10px] font-semibold">Delete</span>
        </button>
      )}

      <button
        onClick={handleClick}
        style={{ transform: `translateX(${swipeX}px)`, transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease' }}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left relative ${
          isFullySettled
            ? 'bg-gray-50 dark:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-700'
            : 'bg-white dark:bg-gray-800 active:bg-gray-50 dark:active:bg-gray-700'
        }`}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${isFullySettled ? 'opacity-40' : ''}`}
          style={{ backgroundColor: expense.category?.color ? `${expense.category.color}25` : '#f3f4f6' }}
        >
          {expense.category?.icon || '💸'}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isFullySettled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
            {expense.title || expense.category?.name || 'Expense'}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {expense.paymentType?.name} · {formatDate(expense.expenseDate)}
          </p>

          <div className="flex flex-wrap gap-1 mt-0.5">
            {isReimbursement && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                ↩ Reimbursement
              </span>
            )}
            {expense.paidForPersonId ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                🧾 Paid for {expense.paidForPerson?.name}
              </span>
            ) : expense.splits?.length > 0 && !isFullySettled && expense.splits.some((s) => ['PENDING', 'PAYMENT_REQUESTED'].includes(s.status)) ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full">
                ⚖️ Split
              </span>
            ) : null}

            {expense.recurringExpense && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
                🔁 {expense.recurringExpense.isActive ? 'Recurring' : 'Recurring (paused)'}
              </span>
            )}

            {isFullySettled && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                ✓ Settled
              </span>
            )}
            {isPartiallySettled && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                ↩ {settledLabel} paid ₹{settledAmount.toFixed(0)}
              </span>
            )}
            {waivedSplits.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                🎁 Waived for {waivedLabel}
              </span>
            )}
            {expense.group && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); navigate(`/groups/${expense.group.id}`); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate(`/groups/${expense.group.id}`); } }}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full cursor-pointer"
              >
                {expense.group.icon} {expense.group.name}
              </span>
            )}
            {expense.tabEntry?.tab && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); navigate(`/tabs/${expense.tabEntry.tab.id}`); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate(`/tabs/${expense.tabEntry.tab.id}`); } }}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full cursor-pointer"
              >
                🤝 {expense.tabEntry.tab.name}
              </span>
            )}
            {expense.tabSettlement?.tab && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); navigate(`/tabs/${expense.tabSettlement.tab.id}`); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate(`/tabs/${expense.tabSettlement.tab.id}`); } }}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 bg-teal-50 dark:bg-teal-900/30 px-2 py-0.5 rounded-full cursor-pointer"
              >
                🤝 {expense.tabSettlement.tab.name} (settled)
              </span>
            )}
          </div>

          {expense.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {expense.tags.map((tag) => (
                <span key={tag} className="text-[10px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          {isReimbursement ? (
            <>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(currentAmount, expense.currency || 'INR')}</p>
              {inrEquiv !== null && (
                <p className="text-[10px] text-emerald-500/70 dark:text-emerald-600 text-right">≈ {formatCurrency(inrEquiv, 'INR')}</p>
              )}
            </>
          ) : (
            <>
              <p className={`text-sm font-semibold ${isFullySettled ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                {formatCurrency(currentAmount, expense.currency || 'INR')}
              </p>
              {inrEquiv !== null && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-right">≈ {formatCurrency(inrEquiv, 'INR')}</p>
              )}
            </>
          )}
        </div>
      </button>
    </div>
  );
}
