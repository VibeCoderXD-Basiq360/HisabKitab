import { useState, useEffect } from 'react';

const SHORTCUTS = [
  { key: 'N', description: 'New expense' },
  { key: '/', description: 'Focus search' },
  { key: 'G', description: 'Go to Groups' },
  { key: 'B', description: 'Go to Balances' },
  { key: 'A', description: 'Go to Analytics' },
  { key: 'S', description: 'Go to Settings' },
  { key: 'H', description: 'Go to Home' },
  { key: '?', description: 'Show this help' },
];

export default function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('kb-shortcuts-help', show);
    return () => window.removeEventListener('kb-shortcuts-help', show);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {SHORTCUTS.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-300">{description}</span>
              <kbd className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-mono text-xs font-semibold border border-gray-200 dark:border-gray-600">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
          Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono text-[10px]">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
