const { Router } = require('express');
const multer = require('multer');
const auth = require('../../middleware/auth');
const { scanReceipt } = require('./ocr.controller');

// Keep image in memory — we only need it for the API call, no disk storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    cb(ok ? null : new Error('Invalid file type'), ok);
  },
});

const router = Router();
router.post('/scan', auth, upload.single('image'), scanReceipt);

module.exports = router;
