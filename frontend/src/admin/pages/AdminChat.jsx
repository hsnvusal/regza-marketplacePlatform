import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  User, 
  Clock, 
  Send, 
  Filter,
  Search,
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { adminChatService } from '../../services/chatService';
import socketService from '../../services/socketService';
import toast from 'react-hot-toast';
import './AdminChat.css';

const AdminChat = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });

  // Konuşmaları yükle
  const loadConversations = async (page = 1) => {
    setIsLoading(true);
    try {
      const filters = {
        page,
        limit: 10,
        ...(filter !== 'all' && { status: filter })
      };
      
      const response = await adminChatService.getConversations(filters);
      setConversations(response.data.conversations);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Konuşmalar yüklenirken hata oluştu');
      console.error('Load conversations error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Admin socket bağlantısını kur
  const connectAdminSocket = () => {
    const token = localStorage.getItem('adminToken');
    console.log('🔧 AdminChat: Connecting socket...', {
      hasToken: !!token,
      token: token ? `${token.substring(0, 20)}...` : 'NO TOKEN'
    });
    
    if (!token) {
      console.error('❌ AdminChat: No admin token found for socket connection');
      return;
    }

    socketService.connect(token);
    
    // Socket status'u güncelle
    setTimeout(() => {
      const status = socketService.getStatus();
      console.log('🔧 AdminChat: Socket status after connect:', status);
      setIsSocketConnected(status.isConnected);
    }, 1000);

    // Admin socket event listeners
    socketService.onNewUserMessage((data) => {
      console.log('💬 New user message:', data);
      toast.success(`${data.userName} yeni mesaj gönderdi`);
      
      // Yeni mesajı oluştur
      const newMessage = {
        sender: 'user',
        message: data.message,
        timestamp: data.timestamp,
        isRead: false,
        _id: Date.now() // Geçici ID
      };
      
      // Konuşma listesini güncelle
      setConversations(prev => 
        prev.map(conv => 
          conv._id === data.chatId 
            ? { 
                ...conv, 
                lastMessage: data.timestamp, 
                status: data.status,
                // Eğer bu konuşmanın mesajları varsa, yeni mesajı ekle
                messages: conv.messages ? [...conv.messages, newMessage] : [newMessage]
              }
            : conv
        )
      );
      
      // Eğer aktif konuşma ise, selectedConversation'ı da güncelle
      if (selectedConversation && selectedConversation._id === data.chatId) {
        setSelectedConversation(prev => ({
          ...prev,
          messages: [...(prev.messages || []), newMessage],
          lastMessage: data.timestamp,
          status: data.status
        }));
      }
    });

    socketService.onReplySent((data) => {
      console.log('✅ Reply sent via socket:', data);
      if (data.success) {
        setSelectedConversation(data.data);
        setReplyMessage('');
        
        // Konuşma listesini güncelle
        setConversations(prev => 
          prev.map(conv => 
            conv._id === selectedConversation._id 
              ? { 
                  ...conv, 
                  lastMessage: data.data.lastMessage, 
                  status: data.data.status,
                  messages: data.data.messages
                }
              : conv
          )
        );
        
        toast.success('Cevap gönderildi');
      }
      setIsSending(false);
    });

    socketService.onStatusUpdated((data) => {
      console.log('📋 Status updated via socket:', data);
      if (data.success) {
        setSelectedConversation(data.data);
        
        // Konuşma listesini güncelle
        setConversations(prev => 
          prev.map(conv => 
            conv._id === data.data._id 
              ? { ...conv, status: data.data.status }
              : conv
          )
        );
        
        toast.success('Durum güncellendi');
      }
    });

    socketService.onChatUpdated((data) => {
      console.log('🔄 Chat updated:', data);
      
      // Konuşma listesini güncelle
      setConversations(prev => 
        prev.map(conv => 
          conv._id === data.chatId 
            ? { ...conv, status: data.status, lastMessage: data.lastMessage }
            : conv
        )
      );
      
      // Eğer güncelenen konuşma aktif konuşma ise, onu da güncelle
      if (selectedConversation && selectedConversation._id === data.chatId) {
        setSelectedConversation(prev => ({
          ...prev,
          status: data.status,
          lastMessage: data.lastMessage
        }));
      }
    });

    socketService.onError((error) => {
      console.error('❌ Admin socket error:', error);
      toast.error(error.message || 'Bir hata oluştu');
      setIsSending(false);
    });
  };

  // Admin socket bağlantısını kapat
  const disconnectAdminSocket = () => {
    socketService.disconnect();
    setIsSocketConnected(false);
  };

  // Cevap gönder (Socket.IO ile)
  const sendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);

    // Socket bağlıysa real-time gönder
    if (isSocketConnected) {
      const success = socketService.sendAdminReply(
        selectedConversation._id,
        replyMessage.trim()
      );
      if (!success) {
        // Socket bağlı değilse fallback olarak API kullan
        await sendReplyViaAPI();
      }
    } else {
      // Socket bağlı değilse API kullan
      await sendReplyViaAPI();
    }
  };

  // API ile cevap gönder (fallback)
  const sendReplyViaAPI = async () => {
    try {
      const response = await adminChatService.sendReply(
        selectedConversation._id,
        replyMessage.trim()
      );
      
      setSelectedConversation(response.data);
      setReplyMessage('');
      
      // Konuşma listesini güncelle
      setConversations(prev => 
        prev.map(conv => 
          conv._id === selectedConversation._id 
            ? { ...conv, lastMessage: new Date(), status: 'active' }
            : conv
        )
      );
      
      toast.success('Cevap gönderildi');
    } catch (error) {
      toast.error('Cevap gönderilemedi');
      console.error('Send reply error:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Konuşma durumunu güncelle (Socket.IO ile)
  const updateStatus = async (chatId, newStatus) => {
    try {
      // Socket bağlıysa real-time güncelle
      if (isSocketConnected) {
        const success = socketService.updateChatStatus(chatId, newStatus);
        if (!success) {
          // Socket bağlı değilse fallback olarak API kullan
          await updateStatusViaAPI(chatId, newStatus);
        }
      } else {
        // Socket bağlı değilse API kullan
        await updateStatusViaAPI(chatId, newStatus);
      }
    } catch (error) {
      toast.error('Durum güncellenirken hata oluştu');
      console.error('Update status error:', error);
    }
  };

  // API ile durum güncelle (fallback)
  const updateStatusViaAPI = async (chatId, newStatus) => {
    await adminChatService.updateChatStatus(chatId, newStatus);
    
    // Seçili konuşmayı güncelle
    if (selectedConversation?._id === chatId) {
      setSelectedConversation(prev => ({ ...prev, status: newStatus }));
    }
    
    // Konuşma listesini güncelle
    setConversations(prev => 
      prev.map(conv => 
        conv._id === chatId 
          ? { ...conv, status: newStatus }
          : conv
      )
    );
    
    toast.success('Durum güncellendi');
  };

  // Zaman formatı
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    }
  };

  // Durum ikonları
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <AlertCircle size={16} className="text-yellow-500" />;
      case 'active':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'closed':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <MessageCircle size={16} className="text-gray-500" />;
    }
  };

  // Filtrelenmiş konuşmalar
  const filteredConversations = conversations.filter(conv => {
    const userName = `${conv.userId?.firstName || ''} ${conv.userId?.lastName || ''}`.trim();
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Sayfa yüklendiğinde konuşmaları getir ve socket'e bağlan
  useEffect(() => {
    loadConversations();
    connectAdminSocket();

    // Cleanup function
    return () => {
      disconnectAdminSocket();
    };
  }, [filter]);

  // Component unmount olduğunda socket'i disconnect et
  useEffect(() => {
    return () => {
      disconnectAdminSocket();
    };
  }, []);

  return (
    <div className="admin-chat">
      <div className="admin-chat-header">
        <h1>
          <MessageCircle size={24} />
          Chat Yönetimi
        </h1>
        <div className="chat-stats">
          <div className="stat">
            <span className="stat-label">Toplam</span>
            <span className="stat-value">{pagination.totalCount}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Bekleyen</span>
            <span className="stat-value pending">
              {conversations.filter(c => c.status === 'pending').length}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Aktif</span>
            <span className="stat-value active">
              {conversations.filter(c => c.status === 'active').length}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-chat-content">
        {/* Conversation List */}
        <div className="conversations-panel">
          <div className="conversations-header">
            <div className="search-container">
              <Search size={20} />
              <input
                type="text"
                placeholder="Konuşma ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-container">
              <Filter size={20} />
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Tümü</option>
                <option value="pending">Bekleyen</option>
                <option value="active">Aktif</option>
                <option value="closed">Kapalı</option>
              </select>
            </div>
          </div>

          <div className="conversations-list">
            {isLoading ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Yükleniyor...</p>
              </div>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map(conversation => (
                <div
                  key={conversation._id}
                  className={`conversation-item ${selectedConversation?._id === conversation._id ? 'selected' : ''}`}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="conversation-header">
                    <div className="user-info">
                      <User size={20} />
                                             <span className="user-name">
                         {`${conversation.userId?.firstName || ''} ${conversation.userId?.lastName || ''}`.trim() || 'Bilinmeyen Kullanıcı'}
                       </span>
                    </div>
                    <div className="conversation-status">
                      {getStatusIcon(conversation.status)}
                    </div>
                  </div>
                  <div className="conversation-preview">
                    <p className="subject">{conversation.subject}</p>
                    <p className="last-message">
                      {conversation.messages?.slice(-1)[0]?.message || 'Mesaj yok'}
                    </p>
                  </div>
                  <div className="conversation-time">
                    <Clock size={14} />
                    <span>{formatTime(conversation.lastMessage)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-conversations">
                <MessageCircle size={48} />
                <p>Konuşma bulunamadı</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => loadConversations(pagination.currentPage - 1)}
                disabled={!pagination.hasPrev}
              >
                Önceki
              </button>
              <span>
                {pagination.currentPage} / {pagination.totalPages}
              </span>
              <button
                onClick={() => loadConversations(pagination.currentPage + 1)}
                disabled={!pagination.hasNext}
              >
                Sonraki
              </button>
            </div>
          )}
        </div>

        {/* Chat Panel */}
        <div className="chat-panel">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                <div className="user-info">
                  <User size={24} />
                  <div>
                                         <h3>{`${selectedConversation.userId?.firstName || ''} ${selectedConversation.userId?.lastName || ''}`.trim() || 'Bilinmeyen Kullanıcı'}</h3>
                    <p>{selectedConversation.userId?.email}</p>
                  </div>
                </div>
                <div className="chat-actions">
                  <select
                    value={selectedConversation.status}
                    onChange={(e) => updateStatus(selectedConversation._id, e.target.value)}
                  >
                    <option value="pending">Bekleyen</option>
                    <option value="active">Aktif</option>
                    <option value="closed">Kapalı</option>
                  </select>
                </div>
              </div>

              <div className="chat-messages">
                {selectedConversation.messages?.map((message, index) => (
                  <div key={index} className={`message ${message.sender}`}>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="sender">
                          {message.sender === 'user' ? 'Kullanıcı' : 'Admin'}
                        </span>
                        <span className="time">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="message-text">
                        {message.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-input">
                <form onSubmit={sendReply}>
                  <div className="input-container">
                    <input
                      type="text"
                      placeholder="Cevabınızı yazın..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      disabled={isSending}
                    />
                    <button
                      type="submit"
                      disabled={!replyMessage.trim() || isSending}
                    >
                      {isSending ? (
                        <div className="spinner"></div>
                      ) : (
                        <Send size={20} />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="no-chat-selected">
              <MessageCircle size={64} />
              <p>Konuşma seçin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat; 