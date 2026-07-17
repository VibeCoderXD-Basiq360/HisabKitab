import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import TopBar from '../../components/TopBar';
import SurfaceCard from '../../components/ui/SurfaceCard';
import Badge from '../../components/ui/Badge';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
} from '../../hooks/useNotifications';

const DANGER_TYPES = new Set([
  'PAYMENT_REJECTED',
  'BUSINESS_PARTNER_DECLINED',
]);

const TYPE_META = {
  SPLIT_CREATED:             { icon: '⚖️' },
  PAYMENT_REQUESTED:         { icon: '💸' },
  PAYMENT_ACCEPTED:          { icon: '✅' },
  PAYMENT_REJECTED:          { icon: '❌' },
  PAID_FOR_CREATED:          { icon: '🧾' },
  SPLIT_WAIVED:              { icon: '🎁' },
  GROUP_ADDED:               { icon: '👥' },
  GROUP_EXPENSE_ADDED:       { icon: '➕' },
  GROUP_SETTLEMENT:          { icon: '🤝' },
  BULK_PAYMENT:              { icon: '💰' },
  BULK_PAYMENT_RESPONSE:     { icon: '✅' },
  BUSINESS_PARTNER_INVITE:   { icon: '🏭' },
  BUSINESS_PARTNER_ACCEPTED: { icon: '🤝' },
  BUSINESS_PARTNER_DECLINED: { icon: '❌' },
};
const DEFAULT_META = { icon: '🔔' };

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar
        title={t('notifications.title')}
        showBack
        action={
          unreadCount > 0 ? (
            <button
              onClick={() => markAllRead.mutate()}
              style={{
                color: '#00C2B2',
                fontWeight: 700,
                fontSize: 13,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 8px',
              }}
            >
              {t('notifications.mark_all')}
            </button>
          ) : null
        }
      />

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: 'calc(100px + env(safe-area-inset-bottom))',
        }}
      >
        {isLoading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: 64,
              color: '#B0B8C4',
            }}
          >
            {t('common.loading')}
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 80,
              gap: 12,
            }}
          >
            <span style={{ fontSize: 48, color: '#00C2B2' }}>🔔</span>
            <p style={{ fontSize: 14, color: '#B0B8C4', margin: 0 }}>
              {t('notifications.no_notifications')}
            </p>
          </div>
        )}

        {Object.entries(grouped).map(([date, items]) => (
          <div key={date} style={{ marginBottom: 8 }}>
            {/* Date group header */}
            <p
              style={{
                padding: '16px 16px 6px',
                fontSize: 11,
                fontWeight: 800,
                color: '#B0B8C4',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                margin: 0,
              }}
            >
              {date}
            </p>

            {/* Notification cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px' }}>
              {items.map((n) => {
                const meta = TYPE_META[n.type] || DEFAULT_META;
                const isDanger = DANGER_TYPES.has(n.type);
                const iconBg = isDanger ? '#FFF1F3' : '#E6FAF9';

                return (
                  <div
                    key={n.id}
                    onClick={() => handleTap(n)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      borderRadius: 16,
                      padding: '12px 14px',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      borderLeft: !n.isRead ? '3px solid #00C2B2' : '3px solid transparent',
                    }}
                  >
                    {/* Icon box */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: 1.4,
                          fontWeight: !n.isRead ? 700 : 500,
                          color: !n.isRead ? '#0A0D14' : '#374151',
                          margin: 0,
                        }}
                      >
                        {n.title}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: '#B0B8C4',
                          marginTop: 2,
                          lineHeight: 1.4,
                          margin: '2px 0 0',
                        }}
                      >
                        {n.body}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: '#B0B8C4',
                          marginTop: 4,
                          margin: '4px 0 0',
                        }}
                      >
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Right side */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      {!n.isRead && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#00C2B2',
                            marginTop: 6,
                            display: 'block',
                          }}
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotif.mutate(n.id);
                        }}
                        style={{
                          color: '#B0B8C4',
                          background: 'none',
                          border: 'none',
                          fontSize: 18,
                          lineHeight: 1,
                          cursor: 'pointer',
                          padding: 0,
                        }}
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
    </div>
  );
}
