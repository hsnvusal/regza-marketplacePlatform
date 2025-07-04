const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Chat = require('../models/Chat');

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    console.log('🔐 Socket Auth: Authenticating...', {
      socketId: socket.id,
      hasToken: !!socket.handshake.auth.token,
      token: socket.handshake.auth.token ? `${socket.handshake.auth.token.substring(0, 20)}...` : 'NO TOKEN'
    });
    
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.error('❌ Socket Auth: No token provided');
      return next(new Error('Token gerekli'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      console.error('❌ Socket Auth: User not found for token');
      return next(new Error('Kullanıcı bulunamadı'));
    }

    socket.user = user;
    console.log('✅ Socket Auth: Success', {
      userId: user.id,
      email: user.email,
      role: user.role
    });
    next();
  } catch (error) {
    console.error('❌ Socket Auth: Error', error.message);
    next(new Error('Token geçersiz'));
  }
};

// Chat socket handlers
const handleChatEvents = (io) => {
  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`🔗 User connected: ${socket.user.email} (${socket.id})`);

    // User'ı kendi room'una ekle
    socket.join(`user_${socket.user.id}`);
    
    // Admin ise admin room'una ekle
    if (socket.user.role === 'admin') {
      socket.join('admin_room');
      console.log(`👑 Admin joined admin room: ${socket.user.email}`);
    }

    // ===== USER EVENTS =====
    
    // Kullanıcı mesaj gönderdi
    socket.on('user_send_message', async (data) => {
      try {
        const { message, subject } = data;
        const userId = socket.user.id;

        if (!message || message.trim() === '') {
          socket.emit('error', { message: 'Mesaj boş olamaz' });
          return;
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

        // Kullanıcıya mesajı gönder
        socket.emit('message_sent', {
          success: true,
          data: chat,
          message: 'Mesaj gönderildi'
        });

        // Adminlere yeni mesaj bildir
        io.to('admin_room').emit('new_user_message', {
          chatId: chat._id,
          userId,
          userName: `${socket.user.firstName} ${socket.user.lastName}`,
          message: message.trim(),
          timestamp: new Date(),
          status: chat.status
        });

        console.log(`💬 User message: ${socket.user.email} -> ${message.substring(0, 50)}...`);

      } catch (error) {
        console.error('User message error:', error);
        socket.emit('error', { message: 'Mesaj gönderilemedi' });
      }
    });

    // ===== ADMIN EVENTS =====
    
    // Admin mesaj gönderdi
    socket.on('admin_send_reply', async (data) => {
      try {
        if (socket.user.role !== 'admin') {
          socket.emit('error', { message: 'Yetkiniz yok' });
          return;
        }

        const { chatId, message } = data;
        const adminId = socket.user.id;

        if (!message || message.trim() === '') {
          socket.emit('error', { message: 'Mesaj boş olamaz' });
          return;
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Konuşma bulunamadı' });
          return;
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

        // Admin'e onay gönder
        socket.emit('reply_sent', {
          success: true,
          data: chat,
          message: 'Cevap gönderildi'
        });

        // Kullanıcıya admin cevabını gönder
        io.to(`user_${chat.userId._id}`).emit('admin_reply', {
          chatId: chat._id,
          adminName: `${socket.user.firstName} ${socket.user.lastName}`,
          message: message.trim(),
          timestamp: new Date()
        });

        // Diğer adminlere güncelleme gönder
        socket.to('admin_room').emit('chat_updated', {
          chatId: chat._id,
          status: chat.status,
          lastMessage: new Date(),
          adminAssigned: chat.adminAssigned
        });

        console.log(`👑 Admin reply: ${socket.user.email} -> ${message.substring(0, 50)}...`);

      } catch (error) {
        console.error('Admin reply error:', error);
        socket.emit('error', { message: 'Cevap gönderilemedi' });
      }
    });

    // Admin chat durumu güncelledi
    socket.on('admin_update_status', async (data) => {
      try {
        if (socket.user.role !== 'admin') {
          socket.emit('error', { message: 'Yetkiniz yok' });
          return;
        }

        const { chatId, status } = data;

        if (!['active', 'closed', 'pending'].includes(status)) {
          socket.emit('error', { message: 'Geçersiz durum' });
          return;
        }

        const chat = await Chat.findByIdAndUpdate(
          chatId,
          { status },
          { new: true }
        ).populate('userId', 'firstName lastName email');

        if (!chat) {
          socket.emit('error', { message: 'Konuşma bulunamadı' });
          return;
        }

        // Admin'e onay gönder
        socket.emit('status_updated', {
          success: true,
          data: chat,
          message: 'Durum güncellendi'
        });

        // Kullanıcıya durum güncellemesini bildir
        io.to(`user_${chat.userId._id}`).emit('chat_status_updated', {
          chatId: chat._id,
          status: status,
          timestamp: new Date()
        });

        // Diğer adminlere güncelleme gönder
        socket.to('admin_room').emit('chat_updated', {
          chatId: chat._id,
          status: status,
          lastMessage: chat.lastMessage
        });

        console.log(`👑 Admin status update: ${socket.user.email} -> ${chatId} -> ${status}`);

      } catch (error) {
        console.error('Admin status update error:', error);
        socket.emit('error', { message: 'Durum güncellenemedi' });
      }
    });

    // ===== COMMON EVENTS =====
    
    // Mesajları okundu olarak işaretle
    socket.on('mark_messages_read', async (data) => {
      try {
        const { chatId, sender } = data;
        const userId = socket.user.id;

        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit('error', { message: 'Konuşma bulunamadı' });
          return;
        }

        // Kullanıcı sadece kendi konuşmasını okuyabilir
        if (socket.user.role !== 'admin' && chat.userId.toString() !== userId) {
          socket.emit('error', { message: 'Yetkiniz yok' });
          return;
        }

        // Mesajları okundu olarak işaretle
        chat.messages.forEach(msg => {
          if (msg.sender === sender && !msg.isRead) {
            msg.isRead = true;
          }
        });

        await chat.save();

        socket.emit('messages_marked_read', {
          success: true,
          chatId,
          sender
        });

        // Karşı tarafa bildir
        if (sender === 'admin') {
          io.to(`user_${chat.userId}`).emit('admin_messages_read', { chatId });
        } else {
          io.to('admin_room').emit('user_messages_read', { chatId, userId: chat.userId });
        }

      } catch (error) {
        console.error('Mark messages read error:', error);
        socket.emit('error', { message: 'Mesajlar işaretlenemedi' });
      }
    });

    // ===== DISCONNECT =====
    
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.email} (${socket.id})`);
    });

    // ===== ERROR HANDLING =====
    
    socket.on('error', (error) => {
      console.error(`❌ Socket error from ${socket.user.email}:`, error);
    });
  });
};

module.exports = { handleChatEvents }; 