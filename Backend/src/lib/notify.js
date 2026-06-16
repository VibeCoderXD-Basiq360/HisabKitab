const admin = require('../config/firebase');

async function sendNotification(fcmToken, { title, body, data = {} }) {
  if (!fcmToken) return;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    });
  } catch (err) {
    console.error('FCM error:', err.message);
  }
}

module.exports = { sendNotification };
