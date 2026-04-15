const mongoose = require('mongoose');

/**
 * Order Model - Customer Orders
 * Full lifecycle: pending → delivered
 * Populates user/items for dashboard
 */
const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: { type: String, required: true }, // Snapshot
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: { // Snapshot at order time
    type: Number,
    required: true
  }
});

const orderStatusEnum = [
  'pending_payment',
  'pending_approval', 
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled'
];

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'pending'
  },
  paymentReference: String,
  receiptImage: String, // Cloudinary URL
  // Delivery
  deliveryAddress: {
    type: String,
    required: function() { 
      return this.deliveryMethod === 'delivery' && this.orderStatus !== 'cancelled'; 
    }
  },
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'delivery'],
    required: true
  },
  pickupLocation: {
    type: String,
    default: 'Belleful Restaurant - Main Branch'
  },
  phoneNumber: String,
  // Status
  orderStatus: {
    type: String,
    enum: orderStatusEnum,
    default: 'pending_payment'
  },
  trackingId: String,
  notes: String,
  // Bank details (manual payment)
  bankAccount: String,
  bankName: String
}, {
  timestamps: true,
  toJSON: { virtuals: true, transform: function(doc, ret) {
    // Safe numeric transforms - prevent toFixed() errors
    ret.totalAmount = Number(ret.totalAmount) || 0;
    ret.items = (ret.items || []).map(item => ({
      ...item,
      price: Number(item.price) || 0
    }));
    return ret;
  }},
  toObject: { virtuals: true, transform: function(doc, ret) {
    ret.totalAmount = Number(ret.totalAmount) || 0;
    ret.items = (ret.items || []).map(item => ({
      ...item,
      price: Number(item.price) || 0
    }));
    return ret;
  }}
});

// Indexes for queries (compound covers user queries)
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });

// Virtuals
orderSchema.virtual('itemCount').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.virtual('displayId').get(function() {
  return `#${this._id.toString().slice(-6).toUpperCase()}`;
});

// Static: Find by status/date
orderSchema.statics.findByStatus = function(status, dateFrom, limit = 20) {
  const query = { orderStatus: status };
  if (dateFrom) query.createdAt = { $gte: new Date(dateFrom) };
  return this.find(query).populate('user', 'name phoneNumber').sort({ createdAt: -1 }).limit(limit);
};

module.exports = mongoose.model('Order', orderSchema);

