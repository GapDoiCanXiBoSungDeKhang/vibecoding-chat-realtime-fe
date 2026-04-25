import React, { useState, useEffect } from 'react';
import { conversationService } from '../services/conversationService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ContactsView from '../components/chat/ContactsView';
import SettingsModal from '../components/chat/SettingsModal';
import SidebarPrimary from '../components/chat/SidebarPrimary';
import SidebarSecondary from '../components/chat/SidebarSecondary';
import ChatArea from '../components/chat/ChatArea';
import CreateGroupModal from '../components/chat/CreateGroupModal';
import { useSocket } from '../context/SocketContext';
import { ChatLayout } from '../layouts/ChatLayout';
import { useConversationSocket } from '../hooks/useConversationSocket';

const ChatPage: React.FC = () => {
  const { logout, user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'chats' | 'contacts'>('chats');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

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

  useEffect(() => {
    fetchConversations();
  }, []);

  useConversationSocket(fetchConversations);

  const handleStartChat = async (userId: string) => {
    try {
      const newConv = await conversationService.createPrivateConversation(userId);
      await fetchConversations();
      setActiveChat(newConv._id);
      setCurrentView('chats');
    } catch (error) {
      toast.error('Không thể tạo cuộc trò chuyện');
    }
  };

  const handleGroupCreated = async (newConvId: string) => {
    setIsCreateGroupOpen(false);
    await fetchConversations();
    setActiveChat(newConvId);
    setCurrentView('chats');
  };

  return (
    <ChatLayout
      primarySidebar={
        <SidebarPrimary 
          user={user}
          currentView={currentView}
          setCurrentView={setCurrentView}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={logout}
          isSettingsOpen={isSettingsOpen}
        />
      }
      secondarySidebar={
        <SidebarSecondary 
          currentView={currentView}
          conversations={conversations}
          isLoading={isLoading}
          onSelectChat={(id) => {
            setActiveChat(id);
            setCurrentView('chats');
          }}
          activeChatId={activeChat}
          onCreateGroup={() => setIsCreateGroupOpen(true)}
          currentUserId={user?.sub || ''}
        />
      }
    >
      {/* Modals */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isCreateGroupOpen && <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} onSuccess={handleGroupCreated} />}
      
      {/* Dynamic Views */}
      {currentView === 'contacts' ? (
        <div className="flex-1 overflow-y-auto animate-in fade-in slide-in-from-right-2 duration-400">
          <ContactsView onStartChat={handleStartChat} />
        </div>
      ) : (
        <ChatArea activeChat={activeChat} onClose={() => setActiveChat(null)} />
      )}
    </ChatLayout>
  );
};

export default ChatPage;
