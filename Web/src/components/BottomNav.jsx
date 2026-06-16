import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/home',      label: 'Home',      icon: '🏠' },
  { to: '/balances',  label: 'Balances',  icon: '⚖️' },
  { to: '/analytics', label: 'Analytics', icon: '📊' },
  { to: '/settings',  label: 'Settings',  icon: '⚙️' },
  { to: '/profile',   label: 'Profile',   icon: '👤' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-20"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center min-h-[56px] gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-primary-600' : 'text-gray-400'
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
