// 🔧 Payment Model (models/Payment.js)

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  stripeChargeId: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'usd'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  customerInfo: {
    email: String,
    name: String,
    phone: String
  },
  orderInfo: {
    orderNumber: String,
    items: Array
  },
  refundId: String,
  refundAmount: Number,
  refundedAt: Date,
  failureReason: String,
  failedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

module.exports = mongoose.model('Payment', paymentSchema);
