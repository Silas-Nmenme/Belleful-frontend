const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');
const { upload, getUploadUrl } = require('../config/cloudinary');

/**
 * Menu Routes - Public browse, Admin CRUD
 */

// Public
router.get('/', menuController.getMenu);
router.get('/:id', menuController.getMenuItem);

// Upload URL endpoint (admin protected + auth headers)
router.get('/upload-url', (req, res) => {
  console.log('/upload-url called - DEBUG START');
  console.log('User auth:', !!req.headers.authorization, req.headers.authorization?.substring(0,20)+'...');
  console.log('Cloudinary:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING',
    api_key: !!process.env.CLOUDINARY_API_KEY,
    api_secret: !!process.env.CLOUDINARY_API_SECRET
  });

  const { folder = 'menu' } = req.query;
  const user = req.user || {};
  
  console.log('/upload-url called:', { 
    folder, 
    userId: user.id, 
    userRole: user.role, 
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'MISSING' 
  });
  
  try {
  const config = getUploadUrl(folder);
  console.log('getUploadUrl SUCCESS:', {
    url_exists: !!config.url,
    fields_count: Object.keys(config.fields || {}).length,
    preset: config.fields?.upload_preset
  });
    console.log('Upload config generated:', { url: config.url, hasFields: !!config.fields });
    res.json(config);
  } catch (error) {
    console.error('Upload URL ERROR:', { 
      message: error.message, 
      stack: error.stack,
      folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME 
    });
    console.error('UPLOAD-URL FULL ERROR:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Upload config failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
      missingCloudinary: !process.env.CLOUDINARY_CLOUD_NAME
    });
  }
});

// Admin protected
router.use(auth);
router.use(isAdmin);

router.post('/', upload.single('image'), menuController.createMenuItem);
router.put('/:id', upload.single('image'), menuController.updateMenuItem);
router.delete('/:id', menuController.deleteMenuItem);

module.exports = router;

