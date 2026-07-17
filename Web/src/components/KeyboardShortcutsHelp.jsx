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
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(10,13,20,0.55)' }}
        onClick={() => setOpen(false)}
      />
      <div
        className="relative shadow-2xl p-6 w-full max-w-sm"
        style={{ background: '#fff', borderRadius: 20 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0A0D14' }}>Keyboard Shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: '#E9ECF0',
              color: '#B0B8C4',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {SHORTCUTS.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span style={{ fontSize: 14, color: '#374151' }}>{description}</span>
              <kbd
                style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  background: '#E9ECF0',
                  color: '#374151',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid #E9ECF0',
                }}
              >
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-center mt-4" style={{ fontSize: 12, color: '#B0B8C4' }}>
          Press{' '}
          <kbd
            style={{
              padding: '1px 6px',
              borderRadius: 4,
              background: '#E9ECF0',
              fontFamily: 'monospace',
              fontSize: 10,
            }}
          >
            Esc
          </kbd>{' '}
          to close
        </p>
      </div>
    </div>
  );
}
