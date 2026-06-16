const prisma = require('../../lib/prisma');
const cloudinary = require('../../config/cloudinary');

const getMe = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
};

const updateMe = async (req, res) => {
  const { name, phone } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data: { name, phone },
  });
  res.json(user);
};

const uploadProfileImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const existing = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (existing?.photoPublicId) {
    await cloudinary.uploader.destroy(existing.photoPublicId);
  }

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: 'hisabkitab/profiles', transformation: [{ width: 200, height: 200, crop: 'fill' }] },
        (err, data) => (err ? reject(err) : resolve(data))
      )
      .end(req.file.buffer);
  });

  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data: { photoUrl: result.secure_url, photoPublicId: result.public_id },
  });

  res.json({ photoUrl: user.photoUrl });
};

const saveFcmToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });
  await prisma.user.update({ where: { id: req.user.userId }, data: { fcmToken: token } });
  res.json({ ok: true });
};

module.exports = { getMe, updateMe, uploadProfileImage, saveFcmToken };
