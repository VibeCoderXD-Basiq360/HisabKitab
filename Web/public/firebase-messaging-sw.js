importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAbLxaNTz5t6bLEw8E4eCcSm6sKXyjy7JI',
  authDomain: 'hisabkitab-2025.firebaseapp.com',
  projectId: 'hisabkitab-2025',
  storageBucket: 'hisabkitab-2025.firebasestorage.app',
  messagingSenderId: '531671858128',
  appId: '1:531671858128:web:38728c0958509c9defd7d5',
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
