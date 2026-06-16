require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('Config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET ? '***set***' : 'MISSING',
});

cloudinary.api.ping((err, result) => {
  if (err) {
    console.error('Cloudinary ping FAILED:', JSON.stringify(err, null, 2));
  } else {
    console.log('Cloudinary ping OK:', result);
  }
});
