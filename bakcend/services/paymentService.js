// Mock payment verification service (Flutterwave webhook style)
const Order = require('../models/Order');

const verifyPaymentMock = async (req, res) => {
  const { reference, amount, status } = req.body;
  
  const order = await Order.findOne({ paymentReference: reference });
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (status === 'successful' && parseFloat(amount) === order.totalAmount) {
    order.paymentStatus = 'paid';
    order.orderStatus = 'pending_approval';
    await order.save();
    // Trigger socket and email
    res.json({ success: true, message: 'Payment verified' });
  } else {
    order.paymentStatus = 'failed';
    await order.save();
    res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
};

const getPaymentDetails = (order) => ({
  accountName: process.env.BANK_ACCOUNT_NAME || 'Vendor Kitchen',
  accountNumber: process.env.BANK_ACCOUNT || '1234567890',
  bank: process.env.BANK_NAME || 'Wema Bank',
  amount: order.totalAmount
});

module.exports = { verifyPaymentMock, getPaymentDetails };

