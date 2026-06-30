import { useEffect } from 'react';
import { getFirebaseMessaging } from '../lib/firebase';
import api from '../lib/api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function useFCM(isLoggedIn) {
  useEffect(() => {
    if (!isLoggedIn || !VAPID_KEY || !('Notification' in window) || import.meta.env.DEV) return;

    const setup = async () => {
      try {
        const permission = await Notification.requestPermission();
        console.log('[FCM] permission:', permission);
        if (permission !== 'granted') return;

        const messaging = await getFirebaseMessaging();
        console.log('[FCM] messaging instance ok');

        const { getToken, onMessage } = await import('firebase/messaging');

        console.log('[FCM] registering SW...');
        const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        // Wait for the SW to fully activate before calling getToken
        await new Promise((resolve) => {
          if (swReg.active?.state === 'activated') return resolve();
          const sw = swReg.installing ?? swReg.waiting ?? swReg.active;
          const handler = () => { if (sw.state === 'activated') resolve(); };
          sw.addEventListener('statechange', handler);
        });
        console.log('[FCM] SW activated');

        // Diagnose Firebase Installations
        try {
          const { getInstallations, getId, getToken: getInstToken } = await import('firebase/installations');
          const app = (await import('../lib/firebase')).default;
          const inst = getInstallations(app);
          const instId = await getId(inst);
          const instToken = await getInstToken(inst);
          console.log('[FCM] Installation ID:', instId);
          console.log('[FCM] Installation token:', instToken ? 'ok' : 'null/empty');
        } catch (instErr) {
          console.error('[FCM] Installations failed:', instErr.code, instErr.message);
        }

        console.log('[FCM] calling getToken...');
        const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
        console.log('[FCM] token:', token ? 'received' : 'null');
        if (token) {
          await api.post('/user/fcm-token', { token });
        }

        onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {};
          if (title) new Notification(title, { body, icon: '/icons/icon-192.png' });
        });
      } catch (err) {
        console.error('[FCM] error code:', err.code);
        console.error('[FCM] error message:', err.message);
        console.error('[FCM] full error:', err);
      }
    };

    setup();
  }, [isLoggedIn]);
}
