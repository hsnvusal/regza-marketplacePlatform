const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'admin'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['active', 'closed', 'pending'],
    default: 'pending'
  },
  subject: {
    type: String,
    default: 'Genel Sorular'
  },
  lastMessage: {
    type: Date,
    default: Date.now
  },
  adminAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Index for better performance
chatSchema.index({ userId: 1, lastMessage: -1 });
chatSchema.index({ status: 1, lastMessage: -1 });

module.exports = mongoose.model('Chat', chatSchema); 