import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useRecurring, useToggleRecurring, useDeleteRecurring, useEditSchedule } from '../../hooks/useRecurring';

const FREQ_LABEL = { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly', WEEKDAYS: 'Weekdays', WEEKENDS: 'Weekends', CUSTOM_DAYS: 'Custom days' };
const FREQ_ICON  = { DAILY: '📅', WEEKLY: '🗓️', MONTHLY: '📆', YEARLY: '🎯', WEEKDAYS: '🗓️', WEEKENDS: '🏖️', CUSTOM_DAYS: '📌' };
const DAY_NAMES  = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

function toLocalDatetimeInput(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ScheduleSheet({ item, onClose }) {
  const { t } = useTranslation();
  const [nextDueDate, setNextDueDate] = useState(toLocalDatetimeInput(item.nextDueDate));
  const [endDate, setEndDate] = useState(item.endDate ? item.endDate.slice(0, 10) : '');
  const edit = useEditSchedule();

  const handleSave = () => {
    edit.mutate(
      { id: item.id, nextDueDate, endDate: endDate || null },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-10 flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
            style={{ backgroundColor: item.category?.color ? `${item.category.color}25` : '#f3f4f6' }}
          >
            {item.category?.icon || '💸'}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('common.edit')} schedule</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{item.title || item.category?.name || 'Recurring expense'}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Next auto-create on</label>
          <input
            type="datetime-local"
            value={nextDueDate}
            onChange={(e) => setNextDueDate(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('expense.end_date')}</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 min-h-[44px] px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white outline-none focus:border-primary-400"
            />
            {endDate && (
              <button type="button" onClick={() => setEndDate('')} className="text-gray-400 text-lg px-2">
                ✕
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t('expense.end_date_hint')}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={edit.isPending || !nextDueDate}
          className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-50"
        >
          {edit.isPending ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </div>
  );
}

export default function RecurringPage() {
  const { t } = useTranslation();
  const { data: items = [], isLoading } = useRecurring();
  const toggle = useToggleRecurring();
  const del = useDeleteRecurring();
  const [editItem, setEditItem] = useState(null);

  const handleDelete = (id, title) => {
    if (window.confirm(`Delete recurring "${title || 'expense'}"? Past instances are kept.`)) {
      del.mutate(id);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('settings.recurring')} showBack />

      <div className="flex-1 p-4 pb-28 flex flex-col gap-3">
        {isLoading && <p className="text-center text-sm text-gray-400 mt-12">{t('common.loading')}</p>}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-16 gap-3">
            <span className="text-5xl">🔁</span>
            <p className="text-sm text-gray-500 font-medium">No recurring expenses yet</p>
            <p className="text-xs text-gray-400 text-center">
              When adding an expense, enable "Make this recurring" to auto-create it on a schedule.
            </p>
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden ${!item.isActive ? 'opacity-60' : ''}`}>
            <div className="px-4 py-3 flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: item.category?.color ? `${item.category.color}25` : '#f3f4f6' }}
              >
                {item.category?.icon || '💸'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {item.title || item.category?.name || 'Expense'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {item.paymentType?.name} · {FREQ_ICON[item.frequency]} {FREQ_LABEL[item.frequency]}
                  {item.frequency === 'CUSTOM_DAYS' && item.customDays?.length > 0 && (
                    <span className="ml-1">({item.customDays.map((d) => DAY_NAMES[d]).join(', ')})</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Next: {format(new Date(item.nextDueDate), 'd MMM yyyy, h:mm a')}
                </p>
                {item.endDate && (
                  <p className="text-xs text-orange-400 mt-0.5">
                    Ends: {format(new Date(item.endDate), 'd MMM yyyy')}
                  </p>
                )}
                {!item.isActive && item.endDate && new Date(item.nextDueDate) > new Date(item.endDate) && (
                  <p className="text-xs text-red-400 mt-0.5">Completed — past end date</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  ₹{Number(item.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-400">
                  {item.frequency === 'CUSTOM_DAYS' && item.customDays?.length > 0
                    ? item.customDays.map((d) => DAY_NAMES[d]).join('/')
                    : FREQ_LABEL[item.frequency].toLowerCase()}
                </p>
              </div>
            </div>

            <div className="px-4 pb-3 flex gap-2 border-t border-gray-50 dark:border-gray-700 pt-2">
              <button
                onClick={() => toggle.mutate({ id: item.id, isActive: !item.isActive })}
                disabled={toggle.isPending}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  item.isActive
                    ? 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700'
                    : 'border-primary-200 text-primary-600 bg-primary-50 dark:bg-primary-900/30'
                }`}
              >
                {item.isActive ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button
                onClick={() => setEditItem(item)}
                className="flex-1 py-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700"
              >
                🗓 Schedule
              </button>
              <button
                onClick={() => handleDelete(item.id, item.title)}
                disabled={del.isPending}
                className="flex-1 py-2 rounded-xl text-xs font-medium border border-red-100 text-red-500 bg-red-50"
              >
                🗑 {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <BottomNav />

      {editItem && <ScheduleSheet item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  );
}
