import api from './api';

// Chat API servisleri
export const chatService = {
  // Konuşma al veya yeni konuşma başlat
  getOrCreateConversation: async () => {
    const response = await api.get('/chat/conversation');
    return response.data;
  },

  // Mesaj gönder
  sendMessage: async (message, subject = null) => {
    const response = await api.post('/chat/send', { message, subject });
    return response.data;
  },

  // Konuşma detaylarını al
  getChatDetails: async (chatId) => {
    const response = await api.get(`/chat/conversation/${chatId}`);
    return response.data;
  },

  // Mesajları okundu olarak işaretle
  markMessagesAsRead: async (chatId, sender) => {
    const response = await api.put(`/chat/mark-read/${chatId}`, { sender });
    return response.data;
  }
};

// Admin chat API servisleri
export const adminChatService = {
  // Admin konuşmaları al
  getConversations: async (filters = {}) => {
    const { status, page = 1, limit = 10 } = filters;
    const params = new URLSearchParams({ page, limit });
    
    if (status) params.append('status', status);
    
    const response = await api.get(`/chat/admin/conversations?${params}`);
    return response.data;
  },

  // Admin cevap gönder
  sendReply: async (chatId, message) => {
    const response = await api.post(`/chat/admin/reply/${chatId}`, { message });
    return response.data;
  },

  // Konuşma durumunu güncelle
  updateChatStatus: async (chatId, status) => {
    const response = await api.put(`/chat/admin/status/${chatId}`, { status });
    return response.data;
  }
};

export default chatService; 