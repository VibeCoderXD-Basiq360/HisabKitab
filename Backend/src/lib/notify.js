const webpush = require('web-push');
const prisma = require('./prisma');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@hisabkitab.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function notify(userId, pushSubscriptionJson, { title, body, data: payload = {} }) {
  if (userId) {
    try {
      await prisma.notification.create({
        data: { userId, title, body, type: payload?.type || null, data: payload },
      });
    } catch (e) {
      console.error('Notification DB save error:', e.message);
    }
  }

  if (!pushSubscriptionJson) return;

  let subscription;
  try {
    subscription = typeof pushSubscriptionJson === 'string'
      ? JSON.parse(pushSubscriptionJson)
      : pushSubscriptionJson;
    if (!subscription?.endpoint) return; // old FCM token string — skip
  } catch {
    return; // not valid JSON — skip
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body, ...payload })
    );
  } catch (err) {
    console.error('Web push error:', err.statusCode, err.message);
  }
}

async function sendNotification(pushSubscriptionJson, payload) {
  await notify(null, pushSubscriptionJson, payload);
}

module.exports = notify;
module.exports.notify = notify;
module.exports.sendNotification = sendNotification;
