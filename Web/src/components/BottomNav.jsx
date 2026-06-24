import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function BottomNav() {
  const { t } = useTranslation();

  const tabs = [
    { to: '/home',      label: t('nav.home'),      icon: '🏠' },
    { to: '/groups',    label: t('nav.groups'),    icon: '👥' },
    { to: '/tabs',      label: t('nav.tabs'),      icon: '🤝' },
    { to: '/balances',  label: t('nav.balances'),  icon: '⚖️' },
    { to: '/analytics', label: t('nav.analytics'), icon: '📊' },
    { to: '/settings',  label: t('nav.settings'),  icon: '⚙️' },
    { to: '/business',  label: 'Business',          icon: '🏭' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center min-h-[56px] gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-primary-600' : 'text-gray-400 dark:text-gray-500'
            }`
          }
        >
          <span className="text-xl leading-none">{icon}</span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
