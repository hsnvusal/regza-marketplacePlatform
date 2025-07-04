const asyncHandler = require('express-async-handler');
const Chat = require('../models/Chat');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');

// @desc    Kullanıcının konuşmasını al veya yeni konuşma başlat
// @route   GET /api/chat/conversation
// @access  Private
const getOrCreateConversation = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  let chat = await Chat.findOne({ userId }).populate('userId', 'firstName lastName email');

  if (!chat) {
    chat = await Chat.create({
      userId,
      messages: [],
      status: 'pending',
      subject: 'Genel Sorular'
    });
    await chat.populate('userId', 'firstName lastName email');
  }

  return ApiResponse.success(res, chat, 'Konuşma başarıyla alındı');
});

// @desc    Mesaj gönder
// @route   POST /api/chat/send
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
  const { message, subject } = req.body;
  const userId = req.user.id;

  if (!message || message.trim() === '') {
    return ApiResponse.error(res, 'Mesaj boş olamaz', 400);
  }

  let chat = await Chat.findOne({ userId });

  if (!chat) {
    chat = await Chat.create({
      userId,
      messages: [{
        sender: 'user',
        message: message.trim(),
        timestamp: new Date(),
        isRead: false
      }],
      status: 'pending',
      subject: subject || 'Genel Sorular',
      lastMessage: new Date()
    });
  } else {
    chat.messages.push({
      sender: 'user',
      message: message.trim(),
      timestamp: new Date(),
      isRead: false
    });
    chat.lastMessage = new Date();
    chat.status = 'active';
    if (subject) chat.subject = subject;
  }

  await chat.save();
  await chat.populate('userId', 'firstName lastName email');

  return ApiResponse.success(res, chat, 'Mesaj başarıyla gönderildi', 201);
});

// @desc    Admin mesajları al
// @route   GET /api/chat/admin/conversations
// @access  Private/Admin
const getAdminConversations = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  
  const query = {};
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const conversations = await Chat.find(query)
    .populate('userId', 'firstName lastName email')
    .populate('adminAssigned', 'firstName lastName email')
    .sort({ lastMessage: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Chat.countDocuments(query);

  const data = {
    conversations,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalCount: total,
      hasNext: skip + conversations.length < total,
      hasPrev: page > 1
    }
  };

  return ApiResponse.success(res, data, 'Konuşmalar başarıyla alındı');
});

// @desc    Admin mesaj gönder
// @route   POST /api/chat/admin/reply/:chatId
// @access  Private/Admin
const adminReply = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { message } = req.body;
  const adminId = req.user.id;

  if (!message || message.trim() === '') {
    return ApiResponse.error(res, 'Mesaj boş olamaz', 400);
  }

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return ApiResponse.error(res, 'Konuşma bulunamadı', 404);
  }

  // Admin'i atama
  if (!chat.adminAssigned) {
    chat.adminAssigned = adminId;
  }

  chat.messages.push({
    sender: 'admin',
    message: message.trim(),
    timestamp: new Date(),
    isRead: false
  });

  chat.lastMessage = new Date();
  chat.status = 'active';

  await chat.save();
  await chat.populate('userId', 'firstName lastName email');
  await chat.populate('adminAssigned', 'firstName lastName email');

  return ApiResponse.success(res, chat, 'Cevap başarıyla gönderildi', 201);
});

// @desc    Konuşma durumunu güncelle
// @route   PUT /api/chat/admin/status/:chatId
// @access  Private/Admin
const updateChatStatus = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { status } = req.body;

  if (!['active', 'closed', 'pending'].includes(status)) {
    return ApiResponse.error(res, 'Geçersiz durum', 400);
  }

  const chat = await Chat.findByIdAndUpdate(
    chatId,
    { status },
    { new: true }
  ).populate('userId', 'firstName lastName email').populate('adminAssigned', 'firstName lastName email');

  if (!chat) {
    return ApiResponse.error(res, 'Konuşma bulunamadı', 404);
  }

  return ApiResponse.success(res, chat, 'Durum başarıyla güncellendi');
});

// @desc    Mesajları okundu olarak işaretle
// @route   PUT /api/chat/mark-read/:chatId
// @access  Private
const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const { sender } = req.body; // 'user' or 'admin'

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return ApiResponse.error(res, 'Konuşma bulunamadı', 404);
  }

  // Kullanıcı sadece kendi konuşmasını okuyabilir
  if (req.user.role !== 'admin' && chat.userId.toString() !== userId) {
    return ApiResponse.error(res, 'Bu işlem için yetkiniz yok', 403);
  }

  // Mesajları okundu olarak işaretle
  chat.messages.forEach(msg => {
    if (msg.sender === sender && !msg.isRead) {
      msg.isRead = true;
    }
  });

  await chat.save();

  return ApiResponse.success(res, null, 'Mesajlar okundu olarak işaretlendi');
});

// @desc    Konuşma detaylarını al
// @route   GET /api/chat/conversation/:chatId
// @access  Private/Admin
const getChatDetails = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  const chat = await Chat.findById(chatId)
    .populate('userId', 'firstName lastName email')
    .populate('adminAssigned', 'firstName lastName email');

  if (!chat) {
    return ApiResponse.error(res, 'Konuşma bulunamadı', 404);
  }

  // Kullanıcı sadece kendi konuşmasını görebilir
  if (req.user.role !== 'admin' && chat.userId.toString() !== userId) {
    return ApiResponse.error(res, 'Bu işlem için yetkiniz yok', 403);
  }

  return ApiResponse.success(res, chat, 'Konuşma detayları başarıyla alındı');
});

module.exports = {
  getOrCreateConversation,
  sendMessage,
  getAdminConversations,
  adminReply,
  updateChatStatus,
  markMessagesAsRead,
  getChatDetails
}; 