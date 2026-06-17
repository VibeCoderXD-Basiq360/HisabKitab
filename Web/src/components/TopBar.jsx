import { useNavigate } from 'react-router-dom';
import { useUnreadCount } from '../hooks/useNotifications';

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

export default function TopBar({ title, showBack = false, action, showBell = false }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-100 flex items-center px-4 min-h-[56px]">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="mr-3 -ml-2 w-10 h-10 flex items-center justify-center text-gray-600 text-xl"
        >
          ←
        </button>
      )}
      <h1 className="flex-1 text-lg font-semibold text-gray-900">{title}</h1>
      {showBell && <NotificationBell />}
      {action}
    </header>
  );
}
