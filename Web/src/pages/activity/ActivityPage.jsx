import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import api from '../../lib/api';

function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getGroup(date) {
  const now = new Date();
  const d = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 6 * 86400000);
  if (d >= today) return 'Today';
  if (d >= yesterday) return 'Yesterday';
  if (d >= weekAgo) return 'This Week';
  return 'Earlier';
}

const TYPE_COLORS = {
  expense_added: 'bg-gray-100 dark:bg-gray-700',
  split_settled: 'bg-green-100 dark:bg-green-900/30',
  split_waived: 'bg-orange-100 dark:bg-orange-900/30',
  group_member_joined: 'bg-indigo-100 dark:bg-indigo-900/30',
  group_settlement: 'bg-blue-100 dark:bg-blue-900/30',
  group_expense_added: 'bg-violet-100 dark:bg-violet-900/30',
};

export default function ActivityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api.get('/activity').then((r) => r.data),
    staleTime: 30_000,
  });

  // Group items by date section
  const grouped = [];
  const seen = new Set();
  for (const item of items) {
    const g = getGroup(item.createdAt);
    if (!seen.has(g)) {
      seen.add(g);
      grouped.push({ type: 'header', label: g });
    }
    grouped.push({ type: 'item', ...item });
  }

  // Map group labels to translation keys
  const groupLabel = (label) => {
    if (label === 'Today') return t('notifications.today');
    if (label === 'Yesterday') return t('notifications.yesterday');
    return label;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('settings.activity')} showBack />
      <div className="flex-1 pb-24">
        {isLoading && (
          <div className="flex flex-col gap-3 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-24 px-8 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-base font-medium text-gray-700 dark:text-gray-300">No activity yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Add expenses, settle splits, or create groups to see your timeline here.
            </p>
          </div>
        )}

        {!isLoading && grouped.length > 0 && (
          <div className="flex flex-col px-4 gap-0">
            {grouped.map((row, idx) => {
              if (row.type === 'header') {
                return (
                  <p key={`h-${idx}`} className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider pt-5 pb-1">
                    {groupLabel(row.label)}
                  </p>
                );
              }

              const isFirst = grouped[idx - 1]?.type === 'header';
              const isLast =
                idx === grouped.length - 1 || grouped[idx + 1]?.type === 'header';

              return (
                <button
                  key={row.id}
                  onClick={() => navigate(row.link)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left bg-white dark:bg-gray-800 active:bg-gray-50 dark:active:bg-gray-700 ${
                    isFirst ? 'rounded-t-2xl' : ''
                  } ${isLast ? 'rounded-b-2xl' : 'border-b border-gray-100 dark:border-gray-700'}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${TYPE_COLORS[row.type] || 'bg-gray-100 dark:bg-gray-700'}`}
                    style={row.iconBg ? { backgroundColor: row.iconBg } : undefined}
                  >
                    {row.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{row.title}</p>
                    {row.subtitle && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{row.subtitle}</p>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 ml-1">{relativeTime(row.createdAt)}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
