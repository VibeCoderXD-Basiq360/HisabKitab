const admin = require('../config/firebase');
const prisma = require('./prisma');

async function notify(userId, fcmToken, { title, body, data: payload = {} }) {
  // Persist to DB so the user can see notification history
  if (userId) {
    try {
      await prisma.notification.create({
        data: { userId, title, body, type: payload?.type || null, data: payload },
      });
    } catch (e) {
      console.error('Notification DB save error:', e.message);
    }
  }

  // Push via FCM
  if (!fcmToken) return;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])),
    });
  } catch (err) {
    console.error('FCM error:', err.message);
  }
}

// Backward-compat shim — call sites that haven't been updated yet
async function sendNotification(fcmToken, payload) {
  await notify(null, fcmToken, payload);
}

module.exports = { notify, sendNotification };
