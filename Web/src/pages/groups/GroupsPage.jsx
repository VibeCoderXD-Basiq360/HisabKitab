import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { useGroups } from '../../hooks/useGroups';

const TYPE_ICON = { TRIP: '✈️', HOME: '🏠', WORK: '💼', COUPLE: '💑', OTHER: '👥' };

const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function MemberAvatars({ members }) {
  const visible = members.slice(0, 4);
  const overflow = members.length - visible.length;
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((m, i) => (
        <div
          key={m.id || i}
          className="w-7 h-7 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center text-xs font-semibold text-primary-700 flex-shrink-0"
        >
          {initials(m.name)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-semibold text-gray-500 dark:text-gray-300 flex-shrink-0">
          +{overflow}
        </div>
      )}
    </div>
  );
}

function NetBalanceBadge({ net }) {
  const { t } = useTranslation();
  if (net === undefined || net === null) return null;
  const n = Number(net);
  if (n > 0)
    return (
      <span className="text-sm font-semibold text-green-600">{t('groups.owed', { amount: fmt(n) })}</span>
    );
  if (n < 0)
    return (
      <span className="text-sm font-semibold text-red-500">{t('groups.owe', { amount: fmt(Math.abs(n)) })}</span>
    );
  return <span className="text-sm text-gray-400">{t('groups.settled')}</span>;
}

function GroupCard({ group, onClick }) {
  const { t } = useTranslation();
  const typeKey = group.type?.toLowerCase();
  const typeLabel = typeKey && t(`groups.${typeKey}`, { defaultValue: '' }) || t('groups.other');

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 flex flex-col gap-3 text-left active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center text-2xl flex-shrink-0">
            {group.icon || TYPE_ICON[group.type] || '👥'}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-base leading-tight">{group.name}</p>
            <span className="inline-block mt-0.5 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-500 dark:text-gray-400 font-medium">
              {TYPE_ICON[group.type]} {typeLabel}
            </span>
          </div>
        </div>
        <span className="text-gray-300 text-lg mt-1 flex-shrink-0">›</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MemberAvatars members={group.members || []} />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {group.members?.length !== 1
              ? t('groups.member_other', { n: group.members?.length || 0 })
              : t('groups.member_one', { n: 1 })}
          </span>
        </div>
        <NetBalanceBadge net={group.myNet} />
      </div>
    </button>
  );
}

export default function GroupsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data: groups = [], isLoading } = useGroups();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar
        title={t('groups.title')}
        action={
          <button
            onClick={() => navigate('/groups/new')}
            className="text-sm font-semibold text-primary-600 px-3 py-1.5 rounded-xl active:bg-primary-50"
          >
            {t('groups.new')}
          </button>
        }
      />

      <div className="flex-1 overflow-auto pb-28">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 px-8">
            <span className="text-5xl">👥</span>
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">{t('groups.no_groups')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {t('groups.no_groups_desc')}
            </p>
            <button
              onClick={() => navigate('/groups/new')}
              className="mt-2 px-6 py-2.5 bg-primary-600 text-white rounded-2xl text-sm font-semibold active:bg-primary-700"
            >
              {t('groups.create')}
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} onClick={() => navigate(`/groups/${g.id}`)} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
