import { useEffect } from 'react';
import { getFirebaseMessaging } from '../lib/firebase';
import api from '../lib/api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function useFCM(isLoggedIn) {
  useEffect(() => {
    if (!isLoggedIn || !VAPID_KEY || !('Notification' in window)) return;

    const setup = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const messaging = await getFirebaseMessaging();
        const { getToken, onMessage } = await import('firebase/messaging');

        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
          await api.post('/user/fcm-token', { token });
        }

        onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {};
          if (title) new Notification(title, { body, icon: '/icons/icon-192.png' });
        });
      } catch (err) {
        console.error('FCM setup:', err.message);
      }
    };

    setup();
  }, [isLoggedIn]);
}
