const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');

/**
 * Orders Routes - Checkout & Management
 */

// Auth required
router.use(auth);

// Customer routes
router.post('/checkout', orderController.checkout);
router.get('/my-orders', orderController.getMyOrders);
router.get('/my-orders/:id', orderController.getMyOrderById);

// Download routes 
router.get('/download-my-transactions', orderController.downloadMyTransactions);  // Users: their orders only (no admin needed)
router.get('/admin/download', isAdmin, orderController.downloadAdminTransactions);  // Admins: all orders

// Admin routes
router.get('/', isAdmin, orderController.getAllOrders);
router.get('/admin', isAdmin, orderController.getAllOrders);
router.patch('/:id/status', isAdmin, orderController.updateStatus);
router.get('/:id', isAdmin, orderController.getOrderById);

module.exports = router;

