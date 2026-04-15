const express = require('express');
const { contactUs, getAllContacts, getContactById } = require('../controllers/contactController');
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');

const router = express.Router();

router.post('/contact', contactUs);

// Protected admin routes
router.use(auth);
router.use(isAdmin);
router.get('/', getAllContacts);
router.get('/:id', getContactById);

module.exports = router;


