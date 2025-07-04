const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getOrCreateConversation,
  sendMessage,
  getAdminConversations,
  adminReply,
  updateChatStatus,
  markMessagesAsRead,
  getChatDetails
} = require('../controllers/chatController');

// Kullanıcı Routes
router.get('/conversation', protect, getOrCreateConversation);
router.post('/send', protect, sendMessage);
router.get('/conversation/:chatId', protect, getChatDetails);
router.put('/mark-read/:chatId', protect, markMessagesAsRead);

// Admin Routes
router.get('/admin/conversations', protect, adminOnly, getAdminConversations);
router.post('/admin/reply/:chatId', protect, adminOnly, adminReply);
router.put('/admin/status/:chatId', protect, adminOnly, updateChatStatus);

module.exports = router; 