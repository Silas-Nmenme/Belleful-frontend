const auth = require('./auth');

/**
 * Role Middleware - Admin Only
 */
const isAdmin = async (req, res, next) => {
  try {
    await auth(req, res, () => {}); // Run auth first
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

const isStaff = async (req, res, next) => {
  try {
    await auth(req, res, () => {}); // Run auth first
    
    if (req.user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Staff access required'
      });
    }
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

module.exports = { isAdmin, isStaff };

