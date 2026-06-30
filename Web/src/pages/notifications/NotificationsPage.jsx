import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
} from '../../hooks/useNotifications';

const TYPE_META = {
  SPLIT_CREATED:              { icon: '⚖️', bg: 'bg-blue-100' },
  PAYMENT_REQUESTED:          { icon: '💸', bg: 'bg-yellow-100' },
  PAYMENT_ACCEPTED:           { icon: '✅', bg: 'bg-green-100' },
  PAYMENT_REJECTED:           { icon: '❌', bg: 'bg-red-100' },
  PAID_FOR_CREATED:           { icon: '🧾', bg: 'bg-amber-100' },
  SPLIT_WAIVED:               { icon: '🎁', bg: 'bg-orange-100' },
  GROUP_ADDED:                { icon: '👥', bg: 'bg-indigo-100' },
  GROUP_EXPENSE_ADDED:        { icon: '➕', bg: 'bg-indigo-100' },
  GROUP_SETTLEMENT:           { icon: '🤝', bg: 'bg-teal-100' },
  BULK_PAYMENT:               { icon: '💰', bg: 'bg-purple-100' },
  BULK_PAYMENT_RESPONSE:      { icon: '✅', bg: 'bg-green-100' },
  BUSINESS_PARTNER_INVITE:    { icon: '🏭', bg: 'bg-primary-100' },
  BUSINESS_PARTNER_ACCEPTED:  { icon: '🤝', bg: 'bg-green-100' },
  BUSINESS_PARTNER_DECLINED:  { icon: '❌', bg: 'bg-red-100' },
};
const DEFAULT_META = { icon: '🔔', bg: 'bg-gray-100' };

function groupByDate(notifications, t) {
  const groups = {};
  for (const n of notifications) {
    const d = new Date(n.createdAt);
    let label;
    if (isToday(d)) label = t('notifications.today');
    else if (isYesterday(d)) label = t('notifications.yesterday');
    else label = format(d, 'd MMM yyyy');
    (groups[label] = groups[label] || []).push(n);
  }
  return groups;
}

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotif = useDeleteNotification();

  const notifications = data?.data || [];
  const unreadCount = data?.unreadCount || 0;
  const grouped = groupByDate(notifications, t);

  const handleTap = (n) => {
    if (!n.isRead) markRead.mutate(n.id);
    const d = n.data || {};
    if (d.type === 'BUSINESS_PARTNER_INVITE') navigate('/business');
    else if (d.type === 'BUSINESS_PARTNER_ACCEPTED') navigate('/business');
    else if (d.type === 'BUSINESS_PARTNER_DECLINED') navigate('/business');
    else if (d.groupId) navigate(`/groups/${d.groupId}`);
    else if (d.splitId) navigate('/balances');
    else if (d.bulkPaymentId) navigate('/balances');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar
        title={t('notifications.title')}
        showBack
        action={
          unreadCount > 0 ? (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-sm font-medium text-primary-600 px-2"
            >
              {t('notifications.mark_all')}
            </button>
          ) : null
        }
      />

      <div className="flex-1 overflow-y-auto pb-20">
        {isLoading && (
          <div className="flex justify-center pt-16 text-gray-400">{t('common.loading')}</div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 text-gray-400 gap-3">
            <span className="text-5xl">🔔</span>
            <p className="text-sm">{t('notifications.no_notifications')}</p>
          </div>
        )}

        {Object.entries(grouped).map(([date, items]) => (
          <div key={date}>
            <p className="px-4 pt-4 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              {date}
            </p>
            <div className="bg-white dark:bg-gray-800 divide-y divide-gray-50 dark:divide-gray-700">
              {items.map((n) => {
                const meta = TYPE_META[n.type] || DEFAULT_META;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleTap(n)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700 transition-colors ${
                      !n.isRead ? 'bg-blue-50/40 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-full ${meta.bg} flex items-center justify-center text-lg shrink-0 mt-0.5`}>
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{n.body}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary-500 mt-1.5" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotif.mutate(n.id); }}
                        className="text-gray-300 dark:text-gray-600 active:text-red-400 text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
