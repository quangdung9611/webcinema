const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Log để debug (có thể xóa sau)
console.log('☁️ Cloudinary configured with:');
console.log('  Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('  API Key:', process.env.CLOUDINARY_API_KEY ? '✅ exists' : '❌ missing');
console.log('  API Secret:', process.env.CLOUDINARY_API_SECRET ? '✅ exists' : '❌ missing');

module.exports = cloudinary;