import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';

const items = [
  { to: '/settings/categories',  label: 'Categories',          icon: '🏷️', desc: 'Manage expense categories' },
  { to: '/settings/payment-types', label: 'Payment Types',     icon: '💳', desc: 'Cash, UPI, Card…' },
  { to: '/settings/people',      label: 'People',              icon: '👥', desc: 'Tag people in expenses' },
  { to: '/settings/recurring',   label: 'Recurring Expenses',  icon: '🔁', desc: 'Auto-create expenses on a schedule' },
  { to: '/settings/budgets',     label: 'Budget Limits',       icon: '💰', desc: 'Set monthly spending limits per category' },
  { to: '/settings/export',      label: 'Export CSV',           icon: '📤', desc: 'Download expenses as a spreadsheet' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar title="Settings" />
      <div className="flex-1 pb-24 p-4">
        <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
          {items.map(({ to, label, icon, desc }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-3 px-4 min-h-[64px] text-left active:bg-gray-50"
            >
              <span className="text-2xl w-8 text-center">{icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <span className="text-gray-300 text-lg">›</span>
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
