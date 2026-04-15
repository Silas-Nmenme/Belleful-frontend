const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

/**
 * Cloudinary + Multer Setup (Sample/Car Rental Pattern)
 */

console.log('☁️ Cloudinary config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
  api_key: process.env.CLOUDINARY_API_KEY ? 'SET' : 'MISSING',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'SET' : 'MISSING'
});

// Validate required env vars at startup
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('🚨 CLOUDINARY ENV VARS MISSING - Uploads will fail!');
  console.error('Set: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'belleful/menu',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { 
        width: 800, 
        height: 600, 
        crop: 'limit', 
        quality: 'auto:good', 
        fetch_format: 'auto' 
      }
    ]
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter, 
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/** Direct frontend upload URL (keep existing convenience) */
const getUploadUrl = (folder = 'belleful', options = {}) => {
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinary.config().cloud_name}/image/upload`;
  
  const params = new URLSearchParams({
    upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || 'belleful-uploads',
    folder,
    // Remove transformation - common 400 cause for unsigned uploads
    ...options
  });
  console.log('Cloudinary params (no transform):', {
    preset: params.get('upload_preset'),
    folder: params.get('folder')
  });

  return {
    url: `${uploadUrl}?${params.toString()}`,
    fields: Object.fromEntries(params)
  };
};

/** Delete helpers */
const deleteImage = (publicId) => cloudinary.uploader.destroy(publicId);

const extractPublicId = (url) => {
  if (!url) return null;
  const match = url.match(/\/v\d+\/([^/]+)$/);
  return match ? match[1] : null;
};

module.exports = { 
  cloudinary, 
  upload, // Primary multer export for routes
  deleteImage,
  extractPublicId,
  getUploadUrl 
};

