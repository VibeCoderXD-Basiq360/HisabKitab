import { useNavigate } from 'react-router-dom';

export default function TopBar({ title, showBack = false, action }) {
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
      {action}
    </header>
  );
}
