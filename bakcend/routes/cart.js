const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router({ mergeParams: true });
const cartController = require('../controllers/cartController');
const auth = require('../middleware/auth');

/**
 * Cart Routes - Auth required with validation
 */

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// ===== PROTECTED ROUTES =====
router.use(auth);

// GET /cart - no validation needed
router.get('/', cartController.getCart);

// POST /cart - add item
router.post('/',
  body('menuItemId').isMongoId().withMessage('Valid menuItem ID required'),
  body('quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be 1-99'),
  body('deliveryType').optional().isIn(['pickup', 'delivery']).withMessage('Delivery type must be pickup or delivery'),
  validate,
  cartController.addToCart
);

// DELETE /:itemId
router.delete('/:itemId',
  param('itemId').isMongoId().withMessage('Valid item ID required'),
  validate,
  cartController.removeFromCart
);

// PATCH /:itemId - update quantity
router.patch('/:itemId',
  param('itemId').isMongoId().withMessage('Valid item ID required'),
  body('quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be 1-99'),
  body('deliveryType').optional().isIn(['pickup', 'delivery']).withMessage('Delivery type must be pickup or delivery'),
  validate,
  cartController.updateQuantity
);

// DELETE /clear
router.delete('/clear', cartController.clearCart);

module.exports = router;
