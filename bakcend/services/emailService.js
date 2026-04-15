const nodemailer = require('nodemailer');
const emailTemplates = require('../utils/emailTemplates');

/**
 * Email Service - Production OTP, Orders, Notifications
 * Inline templates, config validation, async error handling
 */
let transporter;

/**
 * Initialize transporter with validation
 */
const initTransporter = () => {
  const required = ['EMAIL_HOST', 'EMAIL_PORT', 'MAIL_USER', 'EMAIL_PASS'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length) {
    console.warn('Email service disabled - missing ENV:', missing);
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT == 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  });

  // Verify on init
  transporter.verify(err => {
    if (err) console.error('Email transporter failed:', err.message);
    else console.log('Email service ready');
  });

  return transporter;
};

const getAdminRecipient = () => {
  return process.env.ADMIN_EMAIL || process.env.CONTACT_ADMIN_EMAIL || process.env.MAIL_USER || 'support@belleful.com';
};

// Init on load
initTransporter();

/**
 * Send OTP Email
 */
const sendOTPEmail = async (email, name, otp) => {
  if (!transporter) return { success: false, message: 'Email service unavailable' };

  const html = emailTemplates.otpVerification(name, otp);

  const mailOptions = {
    from: `"Belleful" <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Your Belleful Verification Code',
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error(`OTP email failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Send Welcome Email
 */
const sendWelcomeEmail = async (email, name, htmlTemplate) => {
  if (!transporter) return { success: false };
  return sendTemplateEmail(email, `Welcome to Belleful, ${name}!`, htmlTemplate);
};

/**
 * Generic Template Email
 */
const sendTemplateEmail = async (email, subject, html, htmlTemplate) => {
  if (!transporter) return { success: false };

  const mailOptions = {
    from: `"Belleful" <${process.env.MAIL_USER}>`,
    to: email,
    subject,
    html: htmlTemplate || html
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error(`Template email failed: ${error.message}`);
    return { success: false };
  }
};

/**
 * Send Login Success Email
 */
const sendLoginSuccessEmail = async (email, name) => {
  if (!transporter) return { success: false };

  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' });
  const html = emailTemplates.loginSuccess(name, timestamp);

  const mailOptions = {
    from: `"Belleful" <${process.env.MAIL_USER}>`,
    to: email,
    subject: 'Login Successful - Welcome Back to Belleful! 🍽️',
    html
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error(`Login email failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (email, name, resetUrl) => {
  if (!transporter) return { success: false };

  const html = emailTemplates.passwordReset(name, resetUrl);

  return sendTemplateEmail(
    email,
    'Password Reset - Belleful',
    html
  );
};

const sendContactAdminNotification = async (contact) => {
  const recipient = getAdminRecipient();
  const html = emailTemplates.contactForm(contact.name, contact.email, contact.phone, contact.message.replace(/\n/g, '<br>'), contact.timestamp || new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));

  return sendTemplateEmail(
    recipient,
    `New Contact Form Submission - ${contact.name}`,
    html
  );
};

const sendContactReply = async (email, name) => {
  if (!transporter) return { success: false };

  const html = emailTemplates.contactReply(name);
  return sendTemplateEmail(
    email,
    'We Received Your Message - Belleful',
    html
  );
};

/**
 * Order Confirmation
 */
const sendOrderConfirmation = async (order) => {
  const recipient = order.user?.email || order.email;
  if (!recipient) {
    console.error('Order confirmation failed: missing recipient email');
    return { success: false, message: 'Missing customer email' };
  }

  const html = emailTemplates.orderConfirmation(order);
  return sendTemplateEmail(
    recipient,
    `Order Confirmed - ${order.displayId || '#'+order._id.toString().slice(-6)}`,
    html
  );
};

const sendOrderAdminNotification = async (order) => {
  const recipient = getAdminRecipient();
  const html = emailTemplates.orderAdminNotification(order);
  return sendTemplateEmail(
    recipient,
    `New Order Placed - ${order.displayId || '#'+order._id.toString().slice(-6)}`,
    html
  );
};

/**
 * Order Status Update
 */
const sendOrderStatusUpdate = async (order, status) => {
  const recipient = order.user?.email || order.email;
  if (!recipient) {
    console.error('Order status update failed: missing recipient email');
    return { success: false, message: 'Missing customer email' };
  }

  const html = emailTemplates.orderStatusUpdate(order, status);
  return sendTemplateEmail(
    recipient,
    `Order Update - ${order.displayId || '#'+order._id.toString().slice(-6)}`,
    html
  );
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendTemplateEmail,
  sendLoginSuccessEmail,
  sendPasswordResetEmail,
  sendContactAdminNotification,
  sendContactReply,
  sendOrderConfirmation,
  sendOrderAdminNotification,
  sendOrderStatusUpdate
};


