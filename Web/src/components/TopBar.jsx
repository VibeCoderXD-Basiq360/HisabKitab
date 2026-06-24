import { useNavigate } from 'react-router-dom';
import { useUnreadCount } from '../hooks/useNotifications';
import { useSidebarStore } from '../store/sidebarStore';

function NotificationBell() {
  const navigate = useNavigate();
  const { data: count = 0 } = useUnreadCount();
  return (
    <button
      onClick={() => navigate('/notifications')}
      className="relative w-10 h-10 flex items-center justify-center text-gray-500 text-xl"
    >
      🔔
      {count > 0 && (
        <span className="absolute top-1.5 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}

function HamburgerButton() {
  const toggle = useSidebarStore((s) => s.toggle);
  return (
    <button
      onClick={toggle}
      className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label="Open menu"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <line x1="2" y1="5"  x2="18" y2="5" />
        <line x1="2" y1="10" x2="18" y2="10" />
        <line x1="2" y1="15" x2="18" y2="15" />
      </svg>
    </button>
  );
}

export default function TopBar({ title, subtitle, onBack, showBack = false, action, showBell = false, showSearch = false }) {
  const navigate = useNavigate();

  const hasBack = !!(onBack || showBack);

  function handleBack() {
    if (onBack) onBack();
    else navigate(-1);
  }

  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center px-3 min-h-[56px]">
      {hasBack ? (
        <button
          onClick={handleBack}
          className="mr-2 -ml-1 w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 text-xl rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          ←
        </button>
      ) : (
        <HamburgerButton />
      )}

      <div className="flex-1 min-w-0 ml-1">
        <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white truncate leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400 truncate leading-tight">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-0.5 ml-1">
        {showSearch && (
          <button
            onClick={() => navigate('/search')}
            className="w-10 h-10 flex items-center justify-center text-gray-500 text-xl"
          >
            🔍
          </button>
        )}
        {showBell && <NotificationBell />}
        {action}
        {hasBack && <HamburgerButton />}
      </div>
    </header>
  );
}
