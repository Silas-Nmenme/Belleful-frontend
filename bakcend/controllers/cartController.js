const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');

/**
 * Cart Controller - Production-Ready with Full Validation & Stock Management
 * Features: Stock deduction, transactions, detailed errors, consistent totals
 */

const handleCartError = (res, error, context = 'Operation failed') => {
  console.error(`[Cart ${context}] Error:`, error);
  res.status(500).json({ 
    success: false, 
    message: 'Server error. Please try again.' 
  });
};

// Helper: Validate and snapshot menu item
const validateAndSnapshotItem = async (menuItemId, quantity) => {
  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem) {
    const error = new Error('Menu item not found');
    error.status = 404;
    throw error;
  }
  if (!menuItem.available) {
    const error = new Error('Item is currently unavailable');
    error.status = 400;
    throw error;
  }
  if (menuItem.stock < quantity) {
    const error = new Error(`Insufficient stock. Only ${menuItem.stock} available`);
    error.status = 400;
    throw error;
  }

  // Return snapshot + item for stock update
  return {
    snapshot: {
      menuItem: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      image: menuItem.image || '',
      quantity
    },
    itemToUpdate: menuItem
  };
};

// ===== GET CART =====
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id }).populate('items.menuItem');
    
    if (!cart) {
      // Don't create empty cart - return clean empty state
      return res.json({ 
        success: true, 
        data: { 
          items: [], 
          deliveryType: 'pickup',
          subtotal: 0,
          deliveryFee: 0,
          serviceFee: 0,
          vatRate: 0,
          grandTotal: 0,
          totalAmount: 0,
          itemCount: 0,
          breakdown: {
            subtotal: 0,
            deliveryFee: 0,
            serviceFee: 0,
            vat: 0,
            grandTotal: 0
          }
        } 
      });
    }

    // Ensure totals are sync'd (triggers pre-save)
    if (cart.isModified('items') || cart.grandTotal === 0) {
      await cart.save();
    }

    // Compute itemCount and breakdown
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const vatAmount = cart.subtotal * cart.vatRate;
    const breakdown = {
      subtotal: cart.subtotal,
      deliveryFee: cart.deliveryFee,
      serviceFee: cart.serviceFee,
      vat: vatAmount,
      grandTotal: cart.grandTotal
    };

    res.json({ 
      success: true, 
      data: { 
        ...cart.toObject(),
        itemCount,
        breakdown 
      } 
    });
  } catch (error) {
    handleCartError(res, error, 'getCart');
  }
};

// ===== ADD/UPDATE ITEM (Unified Logic) =====
const upsertCartItem = async (cart, menuItemId, quantity, session = null) => {
  const { snapshot, itemToUpdate } = await validateAndSnapshotItem(menuItemId, quantity);

  // Deduct stock FIRST
  itemToUpdate.stock -= quantity;
  await itemToUpdate.save({ session });

  // Check existing
  const existingIndex = cart.items.findIndex(item => 
    item.menuItem.toString() === menuItemId
  );

  if (existingIndex > -1) {
    // Update existing quantity
    cart.items[existingIndex].quantity = Math.min(
      cart.items[existingIndex].quantity + quantity,
      itemToUpdate.stock + quantity // Don't exceed original stock
    );
  } else {
    // Add new
    cart.items.push(snapshot);
  }

  return cart;
};

// ===== ADD ITEM =====
exports.addToCart = async (req, res) => {
  const session = await Cart.startSession();
  let cart;
  
  try {
    const { menuItemId, quantity = 1, deliveryType } = req.body;
    
    session.startTransaction();
    
    cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = new Cart({ user: req.user._id });
    }
    if (deliveryType && ['pickup', 'delivery'].includes(deliveryType)) {
      cart.deliveryType = deliveryType;
    }

    await upsertCartItem(cart, menuItemId, quantity, session);
    await cart.save({ session });
    
    await session.commitTransaction();
    
    // Re-fetch populated for response
    cart = await Cart.findOne({ user: req.user._id }).populate('items.menuItem');
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    
    res.json({ success: true, data: cart });
  } catch (error) {
    await session.abortTransaction();
    if (error.status) {
      return res.status(error.status).json({ 
        success: false, 
        message: error.message 
      });
    }
    handleCartError(res, error, 'addToCart');
  } finally {
    session.endSession();
  }
};

// ===== REMOVE ITEM =====
exports.removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart is empty' 
      });
    }

    const initialCount = cart.items.length;
    cart.items = cart.items.filter(item => 
      item.menuItem.toString() !== req.params.itemId
    );

    if (cart.items.length === initialCount) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found in cart' 
      });
    }

    await cart.save();
    res.json({ success: true, data: cart });
  } catch (error) {
    handleCartError(res, error, 'removeFromCart');
  }
};

// ===== UPDATE QUANTITY =====
exports.updateQuantity = async (req, res) => {
  const session = await Cart.startSession();
  
  try {
    const { quantity, deliveryType } = req.body;
    const menuItemId = req.params.itemId;
    
    session.startTransaction();
    
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ 
        success: false, 
        message: 'Cart not found' 
      });
    }
    if (deliveryType && ['pickup', 'delivery'].includes(deliveryType)) {
      cart.deliveryType = deliveryType;
    }

    const itemIndex = cart.items.findIndex(item => 
      item.menuItem.toString() === menuItemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Item not found in cart' 
      });
    }

    const oldQuantity = cart.items[itemIndex].quantity;
    const delta = quantity - oldQuantity;

    // If increasing, validate additional stock
    if (delta > 0) {
      await upsertCartItem(cart, menuItemId, delta, session);
    } else if (delta < 0) {
      // If decreasing, restore stock
      const menuItem = await MenuItem.findById(menuItemId);
      if (menuItem) {
        menuItem.stock += Math.abs(delta);
        await menuItem.save({ session });
      }
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save({ session });
    
    await session.commitTransaction();
    
    // Re-fetch
    cart = await Cart.findOne({ user: req.user._id }).populate('items.menuItem');
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    
    res.json({ success: true, data: cart });
  } catch (error) {
    await session.abortTransaction();
    if (error.status) {
      return res.status(error.status).json({ 
        success: false, 
        message: error.message 
      });
    }
    handleCartError(res, error, 'updateQuantity');
  } finally {
    session.endSession();
  }
};

// ===== CLEAR CART =====
exports.clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.json({ 
        success: true, 
        message: 'Cart already empty' 
      });
    }

    // Restore all stock
    const session = await Cart.startSession();
    try {
      session.startTransaction();
      
      for (const item of cart.items) {
        const menuItem = await MenuItem.findById(item.menuItem);
        if (menuItem) {
          menuItem.stock += item.quantity;
          await menuItem.save({ session });
        }
      }
      
      cart.items = [];
      await cart.save({ session });
      await session.commitTransaction();
    } finally {
      session.endSession();
    }

    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (error) {
    handleCartError(res, error, 'clearCart');
  }
};
