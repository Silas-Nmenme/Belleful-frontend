const mongoose = require('mongoose');

/**
 * Cart Model - User's Shopping Cart
 * Supports multiple items, price snapshots
 */
const cartItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: [true, 'Menu item required']
  },
  name: {
    type: String,
    required: [true, 'Item name required'],
    trim: true
  },
  quantity: {
    type: Number,
    min: [1, 'Minimum quantity 1'],
    max: [99, 'Maximum 99 per item'],
    default: 1
  },
  price: {
    type: Number,
    required: [true, 'Price required'],
    min: [0, 'Price cannot be negative']
  },
  image: {
    type: String,
    trim: true
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deliveryType: {
    type: String,
    enum: ['pickup', 'delivery'],
    default: 'pickup'
  },
  items: [cartItemSchema],
  subtotal: {
    type: Number,
    default: 0
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  serviceFee: {
    type: Number,
    default: 500
  },
  vatRate: {
    type: Number,
    default: 0.015
  },
  grandTotal: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  indexes: [
    { key: { user: 1 }, unique: true },
    { key: { 'items.menuItem': 1 } }
  ]
});



// Auto-calculate totals including fees and VAT
cartSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  this.deliveryFee = this.deliveryType === 'delivery' ? 2000 : 0;
  this.serviceFee = this.items.length ? 500 : 0;
  this.vatRate = this.items.length ? 0.015 : 0;
  const vatAmount = this.subtotal * this.vatRate;
  this.grandTotal = this.subtotal + this.deliveryFee + this.serviceFee + vatAmount;
  this.totalAmount = this.grandTotal; // Keep totalAmount for backwards compat
  next();
});

// Indexes handled in schema options

module.exports = mongoose.model('Cart', cartSchema);

