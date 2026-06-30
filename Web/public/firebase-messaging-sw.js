importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

firebase.initializeApp({
  apiKey: 'AIzaSyAC8_1tmELIgt8BMhSQEj9cpPWXmZR_sks',
  authDomain: 'hisabkitab-26.firebaseapp.com',
  projectId: 'hisabkitab-26',
  storageBucket: 'hisabkitab-26.firebasestorage.app',
  messagingSenderId: '490501302269',
  appId: '1:490501302269:web:cb1de081c6b1b7b11adb94',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  if (!title) return;
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  });
});
