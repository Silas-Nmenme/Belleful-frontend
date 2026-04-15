const Order = require('../models/Order');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');

/**
 * Dashboard Controller - Analytics & Stats
 */

// ===== USER DASHBOARD =====
exports.getUserStats = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const statsResult = await Order.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const monthlyResult = await Order.aggregate([
      { 
        $match: { 
          user: req.user._id,
          createdAt: { $gte: firstDayThisMonth }
        } 
      },
      {
        $group: {
          _id: null,
          monthlyOrders: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      totalOrders: statsResult[0]?.totalOrders || 0,
      totalSpent: Math.round(statsResult[0]?.totalSpent || 0),
      avgOrderValue: Math.round(statsResult[0]?.avgOrderValue || 0),
      monthlyOrders: monthlyResult[0]?.monthlyOrders || 0
    };

    res.json({ 
      success: true, 
      data: stats
    });
  } catch (error) {
    console.error('getUserStats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== ADMIN STATS =====
exports.getAdminStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          activeUsers: { $addToSet: '$user' }
        }
      },
      { $addFields: { totalUsers: { $size: '$activeUsers' } } }
    ]);

    // Today's orders
    const todayOrders = await Order.countDocuments({
      createdAt: { $gte: today },
      orderStatus: { $ne: 'cancelled' }
    });

    const totalUsers = await User.countDocuments({});
    const activeMenuItems = await MenuItem.countDocuments({available: true});

    const finalStats = {
      totalRevenue: stats[0]?.totalRevenue || 0,
      totalOrders: stats[0]?.totalOrders || 0,
      totalUsers,
      activeMenuItems,
      todayOrders,
      activeUsers: stats[0]?.activeUsers?.length || 0
    };

    res.json({ 
      success: true,
      data: finalStats  // ← FIX: Consistent .data format
    });
  
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== TOP ITEMS =====
exports.getTopItems = async (req, res) => {
  try {
    const topItems = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItem',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    res.json({ success: true, data: topItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAdminUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const matchQuery = search 
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const [users, total] = await Promise.all([
      User.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'orders',
            localField: '_id',
            foreignField: 'user',
            as: 'orders',
            pipeline: [{ $match: { orderStatus: { $ne: 'cancelled' } } }]
          }
        },
        {
          $addFields: {
            totalOrders: { $size: '$orders' }
          }
        },
        {
          $project: {
            password: 0,
            otp: 0,
            otpExpires: 0,
            resetPasswordToken: 0,
            resetPasswordExpire: 0,
            orders: 0
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]),
      User.countDocuments(matchQuery)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



