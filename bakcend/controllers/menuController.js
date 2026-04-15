const MenuItem = require('../models/MenuItem');
const { deleteImage, extractPublicId } = require('../config/cloudinary');

/**
 * Menu Controller - FIXED to match Sample/Car Rental pattern
 * Multer → req.file.path → save URL directly
 */

// ===== GET ALL ITEMS =====
exports.getMenu = async (req, res) => {
  try {
    const { category, available, search, page = 1, limit = 100 } = req.query;
    
    let query = {};
    if (available === 'true') query.available = true;
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };

    const items = await MenuItem.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await MenuItem.countDocuments(query);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== GET SINGLE =====
exports.getMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== VALIDATION HELPER =====
const isValidationError = (error) => error.name === 'ValidationError';

// ===== CREATE ITEM (matches Sample addCar) =====
exports.createMenuItem = async (req, res) => {
  try {
    const itemData = {
      ...req.body,
      stock: req.body.stock ?? 50,
      available: (req.body.stock ?? 50) > 0,
      image: req.file?.path || '/asset/placeholder-food.jpg'  // ← FIXED: use multer file.path
    };
    
    const item = await MenuItem.create(itemData);
    const populated = await MenuItem.findById(item._id); // For virtuals
    
    res.status(201).json({ 
      success: true, 
      data: populated,
      message: 'Menu item created successfully'
    });
  } catch (error) {
    if (isValidationError(error)) {
      const msg = Object.values(error.errors)[0].message;
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(500).json({ success: false, message: 'Server error creating menu item' });
  }
};

// ===== UPDATE ITEM =====
exports.updateMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Handle new image from multer
    if (req.file) {
      // Delete old image
      if (item.image) {
        const oldPublicId = extractPublicId(item.image);
        if (oldPublicId) {
          try {
            await deleteImage(oldPublicId);
          } catch (err) {
            console.warn('Failed to delete old image:', err.message);
          }
        }
      }
      req.body.image = req.file.path;  // Use new uploaded image
    }

    // Update (body.image used if no file, or file.path set above)
    const updateData = {
      ...req.body,
      available: (req.body.stock ?? item.stock) > 0
    };
    
    const updated = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ 
      success: true, 
      data: updated,
      message: 'Menu item updated successfully'
    });
  } catch (error) {
    if (isValidationError(error)) {
      const msg = Object.values(error.errors)[0].message;
      return res.status(400).json({ success: false, message: msg });
    }
    res.status(500).json({ success: false, message: 'Server error updating menu item' });
  }
};

// ===== DELETE ITEM =====
exports.deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Delete image
    if (item.image) {
      const publicId = extractPublicId(item.image);
      if (publicId) {
        await deleteImage(publicId);
      }
    }

    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ 
      success: true, 
      message: 'Menu item deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting menu item' });
  }
};

