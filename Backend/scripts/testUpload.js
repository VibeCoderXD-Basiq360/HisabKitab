require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';

// Test 1: no options at all
cloudinary.uploader.upload(testImage, {}, (err, result) => {
  if (err) console.error('Test 1 (no options) FAILED:', err.message, err.http_code);
  else console.log('Test 1 OK:', result.secure_url);
});
