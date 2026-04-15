const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');
const { isAdmin, isStaff } = require('../middleware/role');

/**
 * Dashboard Routes - Stats & Analytics
 */
router.use(auth);

router.get('/user/stats', dashboardController.getUserStats);
router.get('/user/orders', require('../controllers/orderController').getMyOrders);

router.use(isAdmin);
router.get('/admin/stats', dashboardController.getAdminStats);
router.get('/admin/top-items', dashboardController.getTopItems);
router.get('/admin/users', dashboardController.getAdminUsers);

// Staff dashboard routes
router.use(isStaff);
router.get('/staff/stats', require('../controllers/staffController').getStaffStats);
router.get('/staff/orders', require('../controllers/staffController').getPendingOrders);

module.exports = router;



