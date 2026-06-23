import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useLockStore } from '../../store/lockStore';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import api from '../../lib/api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dark, toggle } = useThemeStore();
  const logout = useAuthStore((s) => s.logout);
  const lockEnabled = useLockStore((s) => s.enabled);
  const [deleting, setDeleting] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/user/me').then((r) => r.data),
  });

  const initials = profile?.name
    ? profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : profile?.email?.[0]?.toUpperCase() || '?';

  // Built dynamically so labels/descs update when language changes
  const items = [
    { to: '/settings/categories',      label: t('settings.categories'),    icon: '🏷️', desc: t('settings.categories_desc') },
    { to: '/settings/payment-types',   label: t('settings.payment_types'), icon: '💳', desc: t('settings.payment_types_desc') },
    { to: '/settings/card-delegations',label: t('settings.shared_cards'),  icon: '🔗', desc: t('settings.shared_cards_desc') },
    { to: '/settings/people',          label: t('settings.people'),        icon: '👥', desc: t('settings.people_desc') },
    { to: '/settings/recurring',       label: t('settings.recurring'),     icon: '🔁', desc: t('settings.recurring_desc') },
    { to: '/settings/budgets',         label: t('settings.budgets'),       icon: '💰', desc: t('settings.budgets_desc') },
    { to: '/settings/export',          label: t('settings.export'),        icon: '📤', desc: t('settings.export_desc') },
    { to: '/settings/templates',       label: 'Quick-Add Templates',       icon: '⚡', desc: 'Manage your expense templates' },
    { to: '/settings/goals',           label: 'Financial Goals',           icon: '🎯', desc: 'Track savings targets & milestones' },
    { to: '/net-worth',                label: 'Net Worth',                 icon: '💎', desc: 'Assets vs liabilities snapshot' },
    { to: '/calendar',                 label: t('settings.calendar'),      icon: '📅', desc: t('settings.calendar_desc') },
    { to: '/settings/import',          label: t('settings.import'),        icon: '📥', desc: t('settings.import_desc') },
    { to: '/activity',                 label: t('settings.activity'),      icon: '📋', desc: t('settings.activity_desc') },
    { to: '/settings/savings-goal',    label: t('settings.savings_goal'),  icon: '🎯', desc: t('settings.savings_goal_desc') },
    { to: '/settings/app-lock',        label: t('settings.app_lock'),      icon: '🔒', desc: t('settings.app_lock_desc') },
    { to: '/loans',                    label: t('settings.loans'),         icon: '🏦', desc: t('settings.loans_desc') },
    { to: '/settings/exchange-rates',  label: t('settings.exchange_rates'),icon: '💱', desc: t('settings.exchange_rates_desc') },
    { to: '/income',                   label: 'Income',                    icon: '💰', desc: 'Log salary, freelance & other income' },
    { to: '/subscriptions',            label: 'Subscriptions',             icon: '📱', desc: 'Track recurring bills & due dates' },
  ];

  async function handleDeleteAccount() {
    if (!window.confirm(t('settings.confirm_delete_1'))) return;
    if (!window.confirm(t('settings.confirm_delete_2'))) return;
    setDeleting(true);
    try {
      await api.delete('/users/me');
      await logout();
      navigate('/login', { replace: true });
    } catch {
      alert(t('settings.delete_failed'));
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title={t('settings.title')} />
      <div className="flex-1 pb-24 p-4 flex flex-col gap-4">

        {/* Profile card */}
        <button
          onClick={() => navigate('/profile')}
          className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-4 flex items-center gap-4 active:bg-gray-50 dark:active:bg-gray-700 text-left"
        >
          <div className="relative shrink-0">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl font-bold">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-[10px]">✏️</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {profile?.name || 'Your Name'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{profile?.email}</p>
            <p className="text-xs text-primary-500 mt-0.5">{t('settings.edit_profile')}</p>
          </div>
        </button>

        {/* Language switcher */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4">
          <LanguageSwitcher />
        </div>

        {/* Dark mode toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-4 min-h-[64px] text-left active:bg-gray-50 dark:active:bg-gray-700"
          >
            <span className="text-2xl w-8 text-center">{dark ? '🌙' : '☀️'}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{t('settings.dark_mode')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{dark ? t('settings.dark_on') : t('settings.dark_off')}</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${dark ? 'bg-primary-500' : 'bg-gray-200'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>

        {/* Menu items */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
          {items.map(({ to, label, icon, desc }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-3 px-4 min-h-[64px] text-left active:bg-gray-50 dark:active:bg-gray-700"
            >
              <span className="text-2xl w-8 text-center">{icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{desc}</p>
              </div>
              {to === '/settings/app-lock' && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mr-1 ${lockEnabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                  {lockEnabled ? t('settings.lock_on') : t('settings.lock_off')}
                </span>
              )}
              <span className="text-gray-300 dark:text-gray-600 text-lg">›</span>
            </button>
          ))}
        </div>

        {/* Danger zone */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="w-full flex items-center gap-3 px-4 min-h-[64px] text-left active:bg-red-50 dark:active:bg-red-900/10 disabled:opacity-50"
          >
            <span className="text-2xl w-8 text-center">🗑️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-500">{deleting ? t('settings.deleting') : t('settings.delete_account')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t('settings.delete_account_desc')}</p>
            </div>
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
