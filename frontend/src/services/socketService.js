import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Socket'e bağlan
  connect(token) {
    if (this.socket && this.isConnected) {
      console.log('🔗 Socket already connected');
      return;
    }

    const SERVER_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
    
    console.log('🔧 Socket Debug Info:', {
      SERVER_URL,
      token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
      VITE_API_URL: import.meta.env.VITE_API_URL
    });
    
    this.socket = io(SERVER_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: this.maxReconnectAttempts
    });

    this.setupEventListeners();
    
    console.log(`🔗 Attempting to connect to Socket.IO server: ${SERVER_URL}`);
  }

  // Event listener'ları kur
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      this.isConnected = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Reconnection events
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Socket reconnected on attempt ${attemptNumber}`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket reconnection attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Socket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ Socket reconnection failed');
      this.isConnected = false;
    });
  }

  // Socket'ten ayrilma
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  // Event emit etme
  emit(eventName, data, callback) {
    if (!this.isConnected || !this.socket) {
      console.warn('⚠️ Socket not connected, cannot emit:', eventName);
      return false;
    }

    if (callback) {
      this.socket.emit(eventName, data, callback);
    } else {
      this.socket.emit(eventName, data);
    }
    return true;
  }

  // Event listener ekleme
  on(eventName, callback) {
    if (!this.socket) {
      console.warn('⚠️ Socket not initialized, cannot listen to:', eventName);
      return;
    }

    this.socket.on(eventName, callback);
  }

  // Event listener kaldırma
  off(eventName, callback) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(eventName, callback);
    } else {
      this.socket.off(eventName);
    }
  }

  // Socket durumu
  getStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // ===== CHAT SPECIFIC METHODS =====

  // Kullanıcı mesaj gönder
  sendUserMessage(message, subject = null) {
    return this.emit('user_send_message', { message, subject });
  }

  // Admin cevap gönder
  sendAdminReply(chatId, message) {
    return this.emit('admin_send_reply', { chatId, message });
  }

  // Chat durumu güncelle
  updateChatStatus(chatId, status) {
    return this.emit('admin_update_status', { chatId, status });
  }

  // Mesajları okundu olarak işaretle
  markMessagesAsRead(chatId, sender) {
    return this.emit('mark_messages_read', { chatId, sender });
  }

  // ===== EVENT HANDLERS =====

  // Kullanıcı mesaj event'leri
  onMessageSent(callback) {
    this.on('message_sent', callback);
  }

  onAdminReply(callback) {
    this.on('admin_reply', callback);
  }

  onChatStatusUpdated(callback) {
    this.on('chat_status_updated', callback);
  }

  // Admin event'leri
  onNewUserMessage(callback) {
    this.on('new_user_message', callback);
  }

  onReplySent(callback) {
    this.on('reply_sent', callback);
  }

  onStatusUpdated(callback) {
    this.on('status_updated', callback);
  }

  onChatUpdated(callback) {
    this.on('chat_updated', callback);
  }

  // Ortak event'ler
  onMessagesMarkedAsRead(callback) {
    this.on('messages_marked_read', callback);
  }

  onError(callback) {
    this.on('error', callback);
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService; 