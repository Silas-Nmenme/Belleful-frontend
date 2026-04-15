const express = require('express');
const router = express.Router();
const { isStaff } = require('../middleware/role');
const staffController = require('../controllers/staffController');

/**
 * Staff Routes - Pending Orders Management
 * Protected: Staff role only
 */

// GET /api/staff/orders - Paginated pending/preparing orders w/ search
router.get('/orders', isStaff, staffController.getPendingOrders);

// GET /api/staff/stats - Staff dashboard stats
router.get('/stats', isStaff, staffController.getStaffStats);

// GET /api/staff/orders/:id - View single order (staff only)
router.get('/orders/:id', isStaff, staffController.viewOrder);

// PATCH /api/staff/orders/:id/status - Limited status updates
router.patch('/orders/:id/status', isStaff, staffController.updateStatusLimited);

module.exports = router;
