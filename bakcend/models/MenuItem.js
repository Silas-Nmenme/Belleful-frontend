const mongoose = require('mongoose');

/**
 * MenuItem Model - Food/Drink Items
 * Enhanced: Inventory tracking, categories, images
 */
const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name required'],
    trim: true,
    maxlength: [100, 'Name too long']
  },
  category: {
    type: String,
    enum: ['food', 'drink', 'side', 'dessert'],
    required: [true, 'Category required']
  },
  price: {
    type: Number,
    required: [true, 'Price required'],
    min: [0, 'Price cannot be negative']
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  image: {
    type: String, // Cloudinary public URL
    default: ''
  },
  available: {
    type: Boolean,
    default: true
  },
  stock: {
    type: Number,
    min: 0,
    default: 50 // Initial stock
  },
  // Admin notes
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Indexes
menuItemSchema.index({ category: 1 });
menuItemSchema.index({ available: 1, stock: 1 });

// Virtual for display price
menuItemSchema.virtual('displayPrice').get(function() {
  return `₦${this.price.toFixed(2)}`;
});

module.exports = mongoose.model('MenuItem', menuItemSchema);

