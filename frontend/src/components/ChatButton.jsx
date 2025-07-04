import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ChatModal from './ChatModal';
import './ChatButton.css';

const ChatButton = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useAuth();

  // Giriş yapmamış kullanıcılar için görünmesin
  if (!user) return null;

  return (
    <>
      <button
        className="chat-float-button"
        onClick={() => setIsChatOpen(true)}
        title="Canlı Destek"
      >
        <MessageCircle size={24} />
        <span className="chat-button-text">Destek</span>
      </button>

      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </>
  );
};

export default ChatButton; 