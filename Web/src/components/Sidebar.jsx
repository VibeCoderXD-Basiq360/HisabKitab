import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSidebarStore } from '../store/sidebarStore';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

function useProfile() {
  const jwt = useAuthStore((s) => s.jwt);
  return useQuery({ queryKey: ['profile'], queryFn: () => api.get('/user/me').then(r => r.data), staleTime: 60_000, enabled: !!jwt });
}

const NAV = [
  {
    section: 'Main',
    items: [
      { to: '/home',          icon: '🏠', label: 'Home' },
      { to: '/calendar',      icon: '📅', label: 'Calendar' },
      { to: '/activity',      icon: '📋', label: 'Activity' },
      { to: '/notifications', icon: '🔔', label: 'Notifications' },
      { to: '/search',        icon: '🔍', label: 'Search' },
    ],
  },
  {
    section: 'Finance',
    items: [
      { to: '/accounts',      icon: '🏦', label: 'Accounts' },
      { to: '/income',        icon: '💰', label: 'Income' },
      { to: '/subscriptions', icon: '🔄', label: 'Subscriptions' },
      { to: '/loans',         icon: '📝', label: 'Loans' },
      { to: '/net-worth',     icon: '📈', label: 'Net Worth' },
      { to: '/cart',          icon: '🛒', label: 'Shopping Cart' },
    ],
  },
  {
    section: 'Social',
    items: [
      { to: '/groups',        icon: '👥', label: 'Groups' },
      { to: '/tabs',          icon: '🤝', label: 'Shared Tabs' },
      { to: '/balances',      icon: '⚖️', label: 'Balances' },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { to: '/analytics',         icon: '📊', label: 'Analytics' },
      { to: '/settings/budgets',  icon: '🎯', label: 'Budgets' },
      { to: '/settings/goals',    icon: '🌟', label: 'Financial Goals' },
    ],
  },
  {
    section: 'Business',
    items: [
      { to: '/business',           icon: '🏭', label: 'Dashboard' },
      { to: '/business/jobs',      icon: '🖨️', label: 'Jobs' },
      { to: '/business/inventory', icon: '📦', label: 'Inventory' },
      { to: '/business/customers', icon: '👤', label: 'Customers' },
      { to: '/business/expenses',  icon: '💸', label: 'Expenses' },
      { to: '/business/pl',        icon: '📉', label: 'P&L Report' },
    ],
  },
  {
    section: 'Account',
    items: [
      { to: '/profile',          icon: '👤', label: 'Profile' },
      { to: '/settings',         icon: '⚙️', label: 'Settings' },
      { to: '/settings/export',  icon: '📤', label: 'Export Data' },
    ],
  },
];

export default function Sidebar() {
  const { isOpen, close } = useSidebarStore();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const { data: profile } = useProfile();

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [close]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  function handleNav(to) {
    close();
    navigate(to);
  }

  function handleLogout() {
    close();
    logout();
    navigate('/login');
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 w-[300px] max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header — user card */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 px-5 pt-12 pb-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => handleNav('/profile')}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                {profile?.photoUrl
                  ? <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                  : <span>{profile?.name?.[0]?.toUpperCase() || '👤'}</span>}
              </div>
              <div className="min-w-0 text-left">
                <p className="font-bold text-white truncate">{profile?.name || 'My Account'}</p>
                <p className="text-xs text-primary-100 truncate">{profile?.email || ''}</p>
              </div>
            </button>
            <button onClick={close} className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white text-xl ml-2 shrink-0">
              ✕
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          {NAV.map(({ section, items }) => (
            <div key={section} className="mb-1">
              <p className="px-5 pt-3 pb-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {section}
              </p>
              {items.map(({ to, icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={close}
                  className={({ isActive }) =>
                    `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`
                  }
                >
                  <span className="text-lg w-6 text-center leading-none">{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}

          {/* Logout */}
          <div className="mx-2 mt-2 mb-4">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="text-lg w-6 text-center">🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">HisabKitab · v1.0</p>
        </div>
      </aside>
    </>
  );
}
