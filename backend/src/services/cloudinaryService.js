const cloudinary = require('cloudinary').v2;
const fs = require('fs');

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

/**
 * Uploads a local file or buffer to Cloudinary
 * @param {string} filePath - Absolute path to local temporary file
 * @param {string} folder - Destination folder in Cloudinary
 * @param {string} resourceType - 'auto' | 'image' | 'raw'
 */
async function uploadFile(filePath, folder = 'skill-setu/documents', resourceType = 'auto') {
  if (!isConfigured) {
    console.log(`[CLOUDINARY DEV] Cloudinary not fully configured in .env. Falling back to local storage.`);
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true
    });
    return result;
  } catch (err) {
    console.warn('Cloudinary upload error:', err.message);
    return null;
  }
}

/**
 * Uploads a profile picture/avatar to Cloudinary with face detection and square cropping
 * @param {string} filePath - Absolute path to local temporary file
 * @param {string} folder - Cloudinary folder (defaults to 'skill-setu/avatars')
 */
async function uploadAvatar(filePath, folder = 'skill-setu/avatars') {
  if (!isConfigured) {
    console.log(`[CLOUDINARY DEV] Cloudinary not fully configured in .env. Falling back to local storage.`);
    return null;
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
      use_filename: false,
      unique_filename: true
    });
    return result;
  } catch (err) {
    console.warn('Cloudinary avatar upload error:', err.message);
    return null;
  }
}

/**
 * Deletes an image from Cloudinary by public ID or full secure URL
 * @param {string} publicIdOrUrl
 */
async function deleteCloudinaryImage(publicIdOrUrl) {
  if (!isConfigured || !publicIdOrUrl) return null;

  try {
    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.startsWith('http')) {
      const matches = publicIdOrUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
      if (matches && matches[1]) {
        publicId = matches[1];
      }
    }
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('Cloudinary delete error:', err.message);
    return null;
  }
}

module.exports = {
  uploadFile,
  uploadAvatar,
  deleteCloudinaryImage,
  cloudinaryConfigured: isConfigured,
  cloudinary
};
