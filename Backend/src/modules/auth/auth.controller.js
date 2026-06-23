const jwt = require('jsonwebtoken');
const admin = require('../../config/firebase');
const prisma = require('../../lib/prisma');
const { linkPendingInvites } = require('../contact/contact.controller');

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍔', color: '#FF5722' },
  { name: 'Transport', icon: '🚌', color: '#2196F3' },
  { name: 'Fuel', icon: '⛽', color: '#FF9800' },
  { name: 'Grocery', icon: '🛒', color: '#4CAF50' },
  { name: 'Medical', icon: '💊', color: '#F44336' },
  { name: 'Entertainment', icon: '🎬', color: '#9C27B0' },
  { name: 'Bills', icon: '📄', color: '#607D8B' },
  { name: 'Education', icon: '📚', color: '#3F51B5' },
  { name: 'Shopping', icon: '🛍️', color: '#E91E63' },
  { name: 'Travel', icon: '✈️', color: '#00BCD4' },
];

const DEFAULT_PAYMENT_TYPES = [
  { name: 'Cash', icon: '💵', color: '#4CAF50', isDefault: true },
  { name: 'UPI', icon: '📱', color: '#2196F3', isDefault: false },
  { name: 'Credit Card', icon: '💳', color: '#9C27B0', isDefault: false },
  { name: 'Debit Card', icon: '🏦', color: '#FF5722', isDefault: false },
];

async function seedDefaults(userId) {
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
    skipDuplicates: true,
  });
  await prisma.paymentType.createMany({
    data: DEFAULT_PAYMENT_TYPES.map((p) => ({ ...p, userId })),
    skipDuplicates: true,
  });
}

const login = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Firebase token required' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    const existing = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });

    let user;
    if (!existing) {
      user = await prisma.user.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email,
          name: decoded.name || null,
          photoUrl: decoded.picture || null,
        },
      });
      await seedDefaults(user.id);
      linkPendingInvites(user).catch(console.error);
    } else {
      user = await prisma.user.update({
        where: { firebaseUid: decoded.uid },
        data: { email: decoded.email },
      });
    }

    const backendToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({ token: backendToken, user });
  } catch {
    res.status(401).json({ error: 'Invalid Firebase token' });
  }
};

module.exports = { login };
