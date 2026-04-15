const Order = require('../models/Order');
const { sendOrderStatusUpdate } = require('../services/emailService');
const mongoose = require('mongoose');

/**
 * Staff Controller - Limited Order Management
 * Staff can: view pending/preparing orders, update to preparing/ready_for_pickup
 */

// ===== STAFF: PAGINATED ORDERS w/ search/filter =====
exports.getPendingOrders = async (req, res) => {
  try {
    const { limit = 20, page = 1, search = '', status } = req.query;
    const skip = (page - 1) * parseInt(limit);

    let query = { orderStatus: { $in: ['pending_approval', 'preparing', 'ready_for_pickup'] } };

    if (search.trim()) {
      query.$or = [
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.phoneNumber': { $regex: search, $options: 'i' } },
        { 'items.name': { $regex: search, $options: 'i' } }
      ];
    }

    if (status && ['pending_approval', 'preparing', 'ready_for_pickup'].includes(status)) {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate('user', 'name phoneNumber email')
      .populate('items.menuItem', 'name price image')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    console.error('Staff getPendingOrders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== STAFF: STATS =====
exports.getStaffStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openOrders = await Order.aggregate([
      { $match: { orderStatus: { $in: ['pending_approval', 'preparing'] } } },
      {
        $group: {
          _id: null,
          pendingApproval: { $sum: { $cond: [{ $eq: ['$orderStatus', 'pending_approval'] }, 1, 0] } },
          preparing: { $sum: { $cond: [{ $eq: ['$orderStatus', 'preparing'] }, 1, 0] } },
          totalOpen: { $sum: 1 }
        }
      }
    ]);

    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today },
      orderStatus: { $nin: ['cancelled'] }
    });

    const stats = {
      pendingApproval: openOrders[0]?.pendingApproval || 0,
      preparing: openOrders[0]?.preparing || 0,
      totalOpen: openOrders[0]?.totalOpen || 0,
      todayOrders,
      recentReady: await Order.countDocuments({ 
        orderStatus: 'ready_for_pickup', 
        createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) } 
      })
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Staff getStaffStats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== LIMITED STATUS UPDATE =====
exports.updateStatusLimited = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    if (!Order.schema.path('orderStatus').enumValues.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status: ${status}. Staff can only use: preparing, ready_for_pickup` 
      });
    }

    const order = await Order.findById(orderId)
      .populate('user', 'name email phoneNumber')
      .populate('items.menuItem', 'name price image');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const currentStatus = order.orderStatus;

    const allowedTransitions = {
      'pending_approval': ['preparing'],
      'preparing': ['ready_for_pickup']
    };

    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return res.status(403).json({ 
        success: false, 
        message: `Staff cannot change ${currentStatus} to ${status}. Allowed: ${allowedTransitions[currentStatus]?.join(', ') || 'none'}` 
      });
    }

    order.orderStatus = status;
    await order.save();

    sendOrderStatusUpdate(order, status).catch(console.error);

    res.json({ 
      success: true, 
      message: `Order #${order.displayId || order._id.slice(-8)} updated to "${status.replace('_', ' ')}"`,
      data: order 
    });
  } catch (error) {
    console.error('Staff updateStatusLimited error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== VIEW SINGLE ORDER =====
exports.viewOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const allowedStatuses = ['pending_approval', 'preparing', 'ready_for_pickup'];

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findOne({ 
      _id: orderId, 
      orderStatus: { $in: allowedStatuses } 
    })
      .populate('user', 'name email phoneNumber')
      .populate('items.menuItem', 'name price image')
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or access denied' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Staff viewOrder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPendingOrders,
  getStaffStats,
  updateStatusLimited,
  viewOrder
};

