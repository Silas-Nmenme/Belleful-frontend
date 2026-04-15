const { body, validationResult } = require('express-validator');
const Contact = require('../models/Contact');
const { sendContactAdminNotification, sendContactReply } = require('../services/emailService');

/**
 * Contact Form Controller - Saves to DB + Email notification + Admin listing
 */
const contactUs = [
  // Validation middleware
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').trim().notEmpty().withMessage('Phone number required').isMobilePhone('any').withMessage('Valid phone required'),
  body('message').trim().notEmpty().withMessage('Message required').isLength({ max: 1000 }).withMessage('Message too long'),

  // Handler
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map(err => err.msg)
      });
    }

    const { name, email, phone, message } = req.body;

    try {
      // Save to DB first
      const contact = new Contact({ name, email, phone, message });
      await contact.save();

      await sendContactAdminNotification({
        name,
        email,
        phone,
        message,
        timestamp: new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' })
      });

      await sendContactReply(email, name);

      res.json({ 
        success: true, 
        message: 'Message saved and sent successfully! We will reply soon.',
        contactId: contact._id
      });
    } catch (error) {
      console.error('Contact save/email error:', error);
      res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
  }
];

// Get all contacts for admin (paginated, sorted newest first)
const getAllContacts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [contacts, total] = await Promise.all([
      Contact.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Contact.countDocuments()
    ]);

    res.json({
      success: true,
      data: contacts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      }
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single contact by ID
const getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id).lean();
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }
    res.json({ success: true, data: contact });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { 
  contactUs, 
  getAllContacts, 
  getContactById 
};

