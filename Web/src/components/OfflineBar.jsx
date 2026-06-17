import { useState, useEffect } from 'react';

export default function OfflineBar() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [justCameBack, setJustCameBack] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setOffline(false);
      setJustCameBack(true);
      setTimeout(() => setJustCameBack(false), 3000);
    }
    function handleOffline() {
      setOffline(true);
      setJustCameBack(false);
    }
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!offline && !justCameBack) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 text-center text-sm py-2 font-medium transition-colors ${
        justCameBack ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
      }`}
    >
      {justCameBack ? '✓ Back online' : '⚡ You\'re offline — showing cached data'}
    </div>
  );
}
