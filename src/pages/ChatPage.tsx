import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Settings, LogOut, Search, Plus, MessageCircle } from 'lucide-react';
import { conversationService } from '../services/conversationService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ContactsView from '../components/chat/ContactsView';

const ChatPage: React.FC = () => {
  const { logout } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'chats' | 'contacts'>('chats');

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const data = await conversationService.getConversations();
      setConversations(data);
      setIsLoading(false);
    } catch (error) {
      toast.error('Failed to load conversations');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className={`app-layout ${activeChat ? 'chat-open' : ''}`}>
      {/* Narrow Sidebar (Zalo Style) */}
      <div className="sidebar-narrow">
        <div 
          className={`sidebar-icon ${currentView === 'chats' ? 'active' : ''}`}
          onClick={() => setCurrentView('chats')}
        >
          <MessageSquare size={24} />
        </div>
        <div 
          className={`sidebar-icon ${currentView === 'contacts' ? 'active' : ''}`}
          onClick={() => setCurrentView('contacts')}
        >
          <Users size={24} />
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div className="sidebar-icon">
            <Settings size={24} />
          </div>
          <div className="sidebar-icon" onClick={handleLogout}>
            <LogOut size={24} />
          </div>
        </div>
      </div>

      {currentView === 'chats' ? (
        <>
          {/* Chat List Sidebar */}
          <div className="sidebar-chat">
            <div className="chat-search-container">
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', borderRadius: '8px', padding: '8px 12px', gap: '8px' }}>
                <Search size={18} color="var(--text-muted)" />
                <input 
                  placeholder="Search conversations..." 
                  style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '14px' }}
                />
              </div>
              <button className="auth-button" style={{ marginTop: '12px', padding: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Plus size={18} /> New Group
              </button>
            </div>

            <div className="chat-list">
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading...</div>
              ) : conversations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>No conversations yet.</div>
              ) : (
                conversations.map((chat) => (
                  <div 
                    key={chat._id} 
                    className={`chat-item ${activeChat === chat._id ? 'active' : ''}`}
                    onClick={() => setActiveChat(chat._id)}
                  >
                    <div className="avatar">
                      {chat.name?.charAt(0) || 'U'}
                    </div>
                    <div className="chat-info">
                      <div className="chat-name">{chat.name}</div>
                      <div className="chat-last-msg">{chat.lastMessage?.content || 'No messages yet'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Content */}
          <div className="main-content">
            {!activeChat ? (
              <div className="empty-state">
                <div style={{ background: 'var(--accent-glow)', padding: '32px', borderRadius: '50%', marginBottom: '24px' }}>
                  <MessageCircle size={64} color="var(--accent-blue)" />
                </div>
                <h2>Select a chat to start messaging</h2>
                <p>Welcome to your chat dashboard. Choose a contact from the left or start a new group conversation.</p>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Chat window for {activeChat} (Coming soon!)</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <ContactsView />
      )}
    </div>
  );
};

export default ChatPage;
