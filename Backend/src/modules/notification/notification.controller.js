const prisma = require('../../lib/prisma');

const list = async (req, res) => {
  const userId = req.user.userId;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const skip = (page - 1) * limit;

  const [data, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  res.json({ data, total, page, limit, unreadCount });
};

const markRead = async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.userId },
    data: { isRead: true },
  });
  res.json({ ok: true });
};

const markAllRead = async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.userId, isRead: false },
    data: { isRead: true },
  });
  res.json({ ok: true });
};

const deleteOne = async (req, res) => {
  await prisma.notification.deleteMany({
    where: { id: req.params.id, userId: req.user.userId },
  });
  res.json({ ok: true });
};

module.exports = { list, markRead, markAllRead, deleteOne };
