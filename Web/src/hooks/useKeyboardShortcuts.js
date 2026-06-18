import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e) {
      // Don't fire when typing in a form element
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isEditable = document.activeElement?.isContentEditable;
      if (['input', 'textarea', 'select'].includes(tag) || isEditable) return;
      // Don't fire with modifier keys
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case 'n':
        case 'N':
          navigate('/expense/new');
          break;
        case '/':
          e.preventDefault();
          navigate('/home?s=1');
          break;
        case 'g':
        case 'G':
          navigate('/groups');
          break;
        case 'b':
        case 'B':
          navigate('/balances');
          break;
        case 'a':
        case 'A':
          navigate('/analytics');
          break;
        case 's':
        case 'S':
          navigate('/settings');
          break;
        case 'h':
        case 'H':
          navigate('/home');
          break;
        case '?':
          window.dispatchEvent(new CustomEvent('kb-shortcuts-help'));
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
