import { useEffect } from 'react';
import api from '../lib/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function useFCM(isLoggedIn) {
  useEffect(() => {
    if (!isLoggedIn || !VAPID_PUBLIC_KEY || !('Notification' in window) || !('serviceWorker' in navigator) || import.meta.env.DEV) return;

    const setup = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;

        const existing = await swReg.pushManager.getSubscription();
        if (existing) await existing.unsubscribe();

        const subscription = await swReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await api.post('/user/fcm-token', { token: JSON.stringify(subscription) });
      } catch (err) {
        console.error('[Push] setup failed:', err.message);
      }
    };

    setup();
  }, [isLoggedIn]);
}
