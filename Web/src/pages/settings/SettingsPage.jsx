import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { useLockStore } from '../../store/lockStore';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import api from '../../lib/api';

const items = [
  { to: '/settings/categories',    label: 'Categories',         icon: '🏷️', desc: 'Manage expense categories' },
  { to: '/settings/payment-types', label: 'Payment Types',      icon: '💳', desc: 'Cash, UPI, Card…' },
  { to: '/settings/people',        label: 'People',             icon: '👥', desc: 'Tag people in expenses' },
  { to: '/settings/recurring',     label: 'Recurring Expenses', icon: '🔁', desc: 'Auto-create expenses on a schedule' },
  { to: '/settings/budgets',       label: 'Budget Limits',      icon: '💰', desc: 'Set monthly spending limits per category' },
  { to: '/settings/export',        label: 'Export CSV',         icon: '📤', desc: 'Download expenses as a spreadsheet' },
  { to: '/calendar',               label: 'Calendar View',      icon: '📅', desc: 'Browse expenses by day on a calendar' },
  { to: '/settings/import',        label: 'Import from CSV',    icon: '📥', desc: 'Import expenses from a bank export or spreadsheet' },
  { to: '/activity',               label: 'Activity Feed',      icon: '📋', desc: 'Timeline of all changes — expenses, settlements, group activity' },
  { to: '/settings/savings-goal',  label: 'Savings Goal',       icon: '🎯', desc: 'Set a monthly savings target and track it on your home screen' },
  { to: '/settings/app-lock',      label: 'App Lock',           icon: '🔒', desc: 'Lock the app with a 4-digit PIN when sent to background' },
  { to: '/loans',                  label: 'EMI Tracker',        icon: '🏦', desc: 'Track loan repayments with amortization schedule' },
  { to: '/settings/exchange-rates', label: 'Exchange Rates',   icon: '💱', desc: 'Set INR conversion rates for foreign currencies' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
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

  async function handleDeleteAccount() {
    if (!window.confirm('Delete your account and ALL data permanently? This cannot be undone.')) return;
    if (!window.confirm('Are you absolutely sure? All expenses, splits, groups, and settings will be gone forever.')) return;
    setDeleting(true);
    try {
      await api.delete('/users/me');
      await logout();
      navigate('/login', { replace: true });
    } catch {
      alert('Failed to delete account. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <TopBar title="Settings" />
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
            <p className="text-xs text-primary-500 mt-0.5">Edit profile & photo →</p>
          </div>
        </button>

        {/* Dark mode toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-4 min-h-[64px] text-left active:bg-gray-50 dark:active:bg-gray-700"
          >
            <span className="text-2xl w-8 text-center">{dark ? '🌙' : '☀️'}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Dark Mode</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{dark ? 'On' : 'Off'} · tap to toggle</p>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${dark ? 'bg-primary-500' : 'bg-gray-200'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>

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
                  {lockEnabled ? 'ON' : 'OFF'}
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
              <p className="text-sm font-medium text-red-500">{deleting ? 'Deleting…' : 'Delete Account'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Permanently delete all your data</p>
            </div>
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
