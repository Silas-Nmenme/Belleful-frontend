const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const { getUploadUrl } = require('../config/cloudinary');

/**
 * Payments Routes - Receipt upload & webhook
 */
router.post('/webhook', paymentController.paymentWebhook); // Public for webhooks

// Public upload url
router.get('/receipt-upload-url', (req, res) => {
  const { folder = 'order-receipts' } = req.query;
  try {
    const uploadData = getUploadUrl(folder);
    console.log('Generated upload URL:', uploadData.url.substring(0, 100) + '...');
    res.json(uploadData);
  } catch (error) {
    console.error('Upload URL generation failed:', error);
    res.status(500).json({ error: 'Upload configuration error' });
  }
});

router.use(auth);
router.post('/receipt', paymentController.uploadReceipt);

module.exports = router;


