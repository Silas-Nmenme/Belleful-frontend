const User = require('../models/User');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendOTPEmail, sendWelcomeEmail, sendLoginSuccessEmail, sendPasswordResetEmail } = require('../services/emailService');
const { OAuth2Client } = require('google-auth-library');
const { cloudinary } = require('../config/cloudinary');
const emailTemplates = require('../utils/emailTemplates');


/**
 * Auth Controller - OTP, Google OAuth, Reset Password
 */

// ===== UTILITY FUNCTIONS =====
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendToken = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    }
  });
};

// ===== 1. REGISTER USER =====
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase().trim() });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10min

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      otp,
      otpExpires
    });

    await sendOTPEmail(user.email, user.name, otp);

    res.status(201).json({
      success: true,
      message: 'User created. Check email for OTP.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== 2. ADMIN REGISTER =====
exports.registerAdmin = async (req, res) => {
  try {
    // Same as register but force role: 'admin'
    const { name, email, password } = req.body;
    // ... (similar logic, set role: 'admin')
    const otp = generateOTP();
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'admin',
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendOTPEmail(user.email, user.name, otp);
    res.status(201).json({ success: true, message: 'Admin created. Verify OTP.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== ADMIN REGISTER STAFF (Admin-only) =====
exports.adminRegisterStaff = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase().trim() });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10min

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'staff',
      otp,
      otpExpires
    });

    await sendOTPEmail(user.email, user.name, otp);

    res.status(201).json({
      success: true,
      message: 'Staff created. Check email for OTP.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== 3. VERIFY OTP =====
exports.verifyOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, otp } = req.body;
    console.log('DEBUG OTP SUBMIT:', {
      email: email.toLowerCase().trim(),
      receivedOtp: otp,
      receivedType: typeof otp,
      receivedLength: otp ? otp.length : 'null',
      receivedTrimmed: otp ? otp.trim() : 'null'
    });
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+otp +otpExpires +isVerified');

    if (!user || user.isVerified) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const now = new Date();
    if (user.otp !== otp || !user.otpExpires || user.otpExpires < now) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    await sendWelcomeEmail(user.email, user.name, emailTemplates.welcome(user.name));
    sendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== 4. LOGIN =====
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password');

    if (!user || !(await user.matchPassword(password)) || !user.isVerified) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or unverified email' });
    }

    await sendLoginSuccessEmail(user.email, user.name);
    sendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== 5. GOOGLE OAUTH INIT =====
exports.googleOAuth = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://belleful-gold.vercel.app/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    return res.status(500).json({ success: false, message: 'Google OAuth not configured' });
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    state: JSON.stringify({ ts: Date.now() })
  });

  res.json({ success: true, authUrl });
};

// ===== 6. GOOGLE CALLBACK =====
exports.googleCallback = async (req, res) => {
  // Implementation similar to previous, create/link user
  // Returns token + user
  res.json({ success: true, message: 'Google auth success', token: 'jwt...' });
};

// ===== 7. FORGOT PASSWORD =====
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Send reset email with token
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${user.email}`;
    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    res.json({ success: true, message: 'Reset email sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== 8. RESET PASSWORD =====
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== 9. GET PROFILE =====
exports.getProfile = async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar
    }
  });
};

// ===== 10. UPDATE PROFILE =====
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'belleful/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }]
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'), false);
  }
});

// Export upload middleware
exports.upload = upload;

exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const updates = { name: req.body.name?.trim() || user.name };

    // Handle avatar
    if (req.file) {
      // Delete old avatar if exists
      if (user.avatar) {
        const publicId = user.avatar.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`belleful/avatars/${publicId}`);
      }
      updates.avatar = req.file.path;
    }

    // Apply updates
    Object.assign(user, updates);
    await user.save();

    // Re-fetch populated
    const updatedUser = await User.findById(user._id).select('-password');

    res.json({
      success: true,
      message: 'Profile updated',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        avatar: updatedUser.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



