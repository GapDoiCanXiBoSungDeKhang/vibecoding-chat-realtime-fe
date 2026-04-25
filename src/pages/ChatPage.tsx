import React, { useState, useEffect } from 'react';
import { conversationService } from '../services/conversationService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ContactsView from '../components/chat/ContactsView';
import SettingsModal from '../components/chat/SettingsModal';
import SidebarPrimary from '../components/chat/SidebarPrimary';
import SidebarSecondary from '../components/chat/SidebarSecondary';
import ChatArea from '../components/chat/ChatArea';

const ChatPage: React.FC = () => {
  const { logout, user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'chats' | 'contacts'>('chats');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const data = await conversationService.getConversations();
      setConversations(data);
    } catch (error) {
      toast.error('Không thể tải danh sách trò chuyện');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-[14px]">
      
      {/* 1. Primary Navigation Sidebar */}
      <SidebarPrimary 
        user={user}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={logout}
        isSettingsOpen={isSettingsOpen}
      />

      {/* 2. Secondary Context Sidebar */}
      <SidebarSecondary 
        currentView={currentView}
        conversations={conversations}
        isLoading={isLoading}
        onSelectChat={(id) => {
          setActiveChat(id);
          setCurrentView('chats');
        }}
        activeChatId={activeChat}
      />

      {/* 3. Main Content Area */}
      <main className="flex-1 h-full relative bg-white flex flex-col overflow-hidden">
        {/* Modals */}
        {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
        
        {/* Dynamic Views */}
        {currentView === 'contacts' ? (
          <div className="flex-1 overflow-y-auto animate-in fade-in slide-in-from-right-2 duration-400">
            <ContactsView />
          </div>
        ) : (
          <ChatArea activeChat={activeChat} />
        )}
      </main>
    </div>
  );
};

export default ChatPage;
