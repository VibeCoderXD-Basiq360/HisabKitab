import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

const STORAGE_KEY = 'hk_offline_queue';

function readQueue() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function writeQueue(q) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(q)); }
  catch {} // storage full — silently skip
}

function makeId() {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useOfflineQueue() {
  const [queue,      setQueue]      = useState(readQueue);
  const [isOnline,   setIsOnline]   = useState(() => navigator.onLine);
  const [isSyncing,  setIsSyncing]  = useState(false);
  const [syncResult, setSyncResult] = useState(null); // { synced, failed }
  const syncingRef = useRef(false);
  const qc = useQueryClient();

  const refresh = useCallback(() => setQueue(readQueue()), []);

  // Add a new expense to the queue; returns its local id
  const enqueue = useCallback((expenseData) => {
    const item = {
      id:        makeId(),
      createdAt: new Date().toISOString(),
      status:    'pending', // 'pending' | 'failed'
      error:     null,
      data:      expenseData,
    };
    const q = [...readQueue(), item];
    writeQueue(q);
    refresh();
    return item.id;
  }, [refresh]);

  const dequeue = useCallback((id) => {
    writeQueue(readQueue().filter((i) => i.id !== id));
    refresh();
  }, [refresh]);

  const markFailed = useCallback((id, error) => {
    writeQueue(readQueue().map((i) => i.id === id ? { ...i, status: 'failed', error } : i));
    refresh();
  }, [refresh]);

  const retryFailed = useCallback((id) => {
    writeQueue(readQueue().map((i) => i.id === id ? { ...i, status: 'pending', error: null } : i));
    refresh();
  }, [refresh]);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    const pending = readQueue().filter((i) => i.status === 'pending');
    if (!pending.length) return;

    syncingRef.current = true;
    setIsSyncing(true);
    let synced = 0, failed = 0;

    for (const item of pending) {
      try {
        await api.post('/expenses', item.data);
        dequeue(item.id);
        synced++;
      } catch (err) {
        const status = err.response?.status;
        if (status >= 400 && status < 500) {
          // Client error (bad categoryId, validation, etc.) — mark failed, keep for user
          markFailed(item.id, err.response?.data?.error || `Server rejected (${status})`);
          failed++;
        } else {
          // Network/5xx — stop processing, retry next time we're online
          break;
        }
      }
    }

    if (synced > 0) qc.invalidateQueries({ queryKey: ['expenses'] });

    setIsSyncing(false);
    syncingRef.current = false;
    if (synced > 0 || failed > 0) setSyncResult({ synced, failed, at: Date.now() });
  }, [dequeue, markFailed, qc]);

  // Online/offline listeners + initial sync attempt
  useEffect(() => {
    const onOnline  = () => { setIsOnline(true);  syncQueue(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    // Try to drain any leftover queue from a previous session
    if (navigator.onLine) syncQueue();
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [syncQueue]);

  const q = queue;
  return {
    queue:        q,
    isOnline,
    isSyncing,
    syncResult,
    pendingCount: q.filter((i) => i.status === 'pending').length,
    failedCount:  q.filter((i) => i.status === 'failed').length,
    enqueue,
    dequeue,
    retryFailed,
    syncQueue,
    clearSyncResult: () => setSyncResult(null),
  };
}
