import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, User, Clock } from 'lucide-react';
import { chatService } from '../services/chatService';
import { useAuth } from '../context/AuthContext';
import socketService from '../services/socketService';
import toast from 'react-hot-toast';
import './ChatModal.css';

const ChatModal = ({ isOpen, onClose }) => {
  const [conversation, setConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();

  // Mesajları sona kaydır
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Konuşmayı yükle
  const loadConversation = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await chatService.getOrCreateConversation();
      setConversation(response.data);
    } catch (error) {
      toast.error('Konuşma yüklenirken hata oluştu');
      console.error('Chat load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Socket bağlantısını kur
  const connectSocket = () => {
    const token = localStorage.getItem('marketplace_token');
    console.log('🔧 ChatModal: Connecting socket...', {
      hasToken: !!token,
      token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN'
    });
    
    if (!token) {
      console.error('❌ ChatModal: No token found for socket connection');
      return;
    }

    socketService.connect(token);
    
    // Socket status'u güncelle
    setTimeout(() => {
      const status = socketService.getStatus();
      console.log('🔧 ChatModal: Socket status after connect:', status);
      setIsSocketConnected(status.isConnected);
    }, 1000);

    // Socket event listeners
    socketService.onMessageSent((data) => {
      console.log('💬 Message sent via socket:', data);
      if (data.success) {
        setConversation(data.data);
        setNewMessage('');
        scrollToBottom();
        toast.success('Mesaj gönderildi');
      }
      setIsSending(false);
    });

    socketService.onAdminReply((data) => {
      console.log('👑 Admin reply received:', data);
      toast.success(`${data.adminName} cevap verdi`);
      
      // Yeni admin mesajını conversation'a ekle
      if (conversation) {
        const newMessage = {
          sender: 'admin',
          message: data.message,
          timestamp: data.timestamp,
          isRead: false,
          _id: Date.now() // Geçici ID
        };
        
        setConversation(prev => ({
          ...prev,
          messages: [...(prev.messages || []), newMessage],
          lastMessage: data.timestamp,
          status: 'active'
        }));
        
        scrollToBottom();
      } else {
        // Eğer conversation yok ise yenile
        loadConversation();
      }
    });

    socketService.onChatStatusUpdated((data) => {
      console.log('📋 Chat status updated:', data);
      setConversation(prev => prev ? { ...prev, status: data.status } : null);
    });

    socketService.onError((error) => {
      console.error('❌ Socket error:', error);
      toast.error(error.message || 'Bir hata oluştu');
      setIsSending(false);
    });
  };

  // Socket bağlantısını kapat
  const disconnectSocket = () => {
    socketService.disconnect();
    setIsSocketConnected(false);
  };

  // Mesaj gönder (Socket.IO ile)
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);

    // Socket bağlıysa real-time gönder
    if (isSocketConnected) {
      const success = socketService.sendUserMessage(newMessage.trim());
      if (!success) {
        // Socket bağlı değilse fallback olarak API kullan
        await sendMessageViaAPI();
      }
    } else {
      // Socket bağlı değilse API kullan
      await sendMessageViaAPI();
    }
  };

  // API ile mesaj gönder (fallback)
  const sendMessageViaAPI = async () => {
    try {
      const response = await chatService.sendMessage(newMessage.trim());
      setConversation(response.data);
      setNewMessage('');
      scrollToBottom();
      toast.success('Mesaj gönderildi');
    } catch (error) {
      toast.error('Mesaj gönderilemedi');
      console.error('Send message error:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Admin mesajlarını okundu olarak işaretle
  const markAdminMessagesAsRead = async () => {
    if (!conversation) return;
    
    try {
      await chatService.markMessagesAsRead(conversation._id, 'admin');
    } catch (error) {
      console.error('Mark messages as read error:', error);
    }
  };

  // Modal açılınca konuşmayı yükle ve socket'e bağlan
  useEffect(() => {
    if (isOpen && user) {
      loadConversation();
      connectSocket();
    } else if (!isOpen) {
      // Modal kapanınca socket'i disconnect et
      disconnectSocket();
    }

    // Cleanup function
    return () => {
      if (!isOpen) {
        disconnectSocket();
      }
    };
  }, [isOpen, user]);

  // Mesajlar değiştiğinde sona kaydır
  useEffect(() => {
    if (conversation?.messages) {
      scrollToBottom();
      markAdminMessagesAsRead();
    }
  }, [conversation?.messages]);

  // Zaman formatı
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('tr-TR');
  };

  if (!isOpen) return null;

  return (
    <div className="chat-modal-overlay" onClick={onClose}>
      <div className="chat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="chat-modal-header">
          <div className="chat-modal-title">
            <MessageCircle size={20} />
            <span>Müşteri Desteği</span>
          </div>
          <button 
            className="chat-modal-close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="chat-modal-messages">
          {isLoading ? (
            <div className="chat-loading">
              <div className="loading-spinner"></div>
              <p>Konuşma yükleniyor...</p>
            </div>
          ) : conversation?.messages?.length > 0 ? (
            <>
              {conversation.messages.map((message, index) => (
                <div key={index} className={`chat-message ${message.sender}`}>
                  <div className="message-content">
                    <div className="message-header">
                      <div className="message-sender">
                        <User size={16} />
                        <span>
                          {message.sender === 'user' ? 'Siz' : 'Müşteri Desteği'}
                        </span>
                      </div>
                      <div className="message-time">
                        <Clock size={14} />
                        <span>{formatTime(message.timestamp)}</span>
                      </div>
                    </div>
                    <div className="message-text">
                      {message.message}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="chat-empty">
              <MessageCircle size={48} />
              <p>Henüz mesaj yok</p>
              <p>Sorunuz veya öneriniz varsa bize yazın!</p>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="chat-modal-input">
          <form onSubmit={sendMessage}>
            <div className="input-container">
              <input
                type="text"
                placeholder="Mesajınızı yazın..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isSending}
                className="message-input"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="send-button"
              >
                {isSending ? (
                  <div className="button-spinner"></div>
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Status */}
        {conversation && (
          <div className="chat-modal-status">
            <div className={`status-indicator ${conversation.status}`}>
              <div className="status-dot"></div>
              <span>
                {conversation.status === 'pending' && 'Bekliyor'}
                {conversation.status === 'active' && 'Aktif'}
                {conversation.status === 'closed' && 'Kapalı'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatModal; 