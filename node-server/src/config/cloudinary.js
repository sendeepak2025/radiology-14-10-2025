const cloudinary = require('cloudinary').v2;

function configureCloudinary(opts = {}) {
  const { cloud_name, api_key, api_secret } = opts;
  if (!cloud_name || !api_key || !api_secret) {
    console.warn('Cloudinary config missing; set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  }
  cloudinary.config({ cloud_name, api_key, api_secret });
  console.log('Cloudinary configured');
  return cloudinary;
}

module.exports = { cloudinary, configureCloudinary };