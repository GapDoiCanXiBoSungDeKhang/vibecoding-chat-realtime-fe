import React, { useState, useEffect } from 'react';
import { conversationService } from '../services/conversationService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ContactsView from '../components/chat/ContactsView';
import SettingsModal from '../components/chat/SettingsModal';
import SidebarPrimary from '../components/chat/SidebarPrimary';
import SidebarSecondary from '../components/chat/SidebarSecondary';
import ChatArea from '../components/chat/ChatArea';
import ConversationPanel from '../components/chat/ConversationPanel';
import CreateGroupModal from '../components/chat/CreateGroupModal';
import CreatePrivateChatModal from '../components/chat/CreatePrivateChatModal';
import { ChatLayout } from '../layouts/ChatLayout';
import { useConversationSocket } from '../hooks/useConversationSocket';
import { useFriendSocket } from '../hooks/useFriendSocket';

const ChatPage: React.FC = () => {
  const { logout, user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [activeChatInfo, setActiveChatInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'chats' | 'contacts'>('chats');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreatePrivateOpen, setIsCreatePrivateOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const fetchConversations = async () => {
    try {
      const data = await conversationService.getConversations();
      setConversations(data);
    } catch {
      toast.error('Không thể tải danh sách trò chuyện');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchConversations(); }, []);

  useConversationSocket(fetchConversations);

  useFriendSocket({
    onUpdate: fetchConversations,
    onAccepted: async (conversationId) => {
      await fetchConversations();
      setActiveChat(conversationId);
      setCurrentView('chats');
    },
  });

  // When activeChat changes, close panel and sync info from conversations list
  useEffect(() => {
    if (activeChat) {
      setIsPanelOpen(false);
      const found = conversations.find(c => c._id === activeChat);
      if (found) setActiveChatInfo(found);
    }
  }, [activeChat]);

  const handleOpenInfo = (conv: any) => {
    setActiveChatInfo(conv);
    setIsPanelOpen(true);
    // If not already on this chat, select it
    if (activeChat !== conv._id) {
      setActiveChat(conv._id);
      setCurrentView('chats');
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      const newConv = await conversationService.createPrivateConversation(userId);
      await fetchConversations();
      setActiveChat(newConv._id);
      setCurrentView('chats');
    } catch {
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
          onCreatePrivate={() => setIsCreatePrivateOpen(true)}
          currentUserId={user?.sub || ''}
          onOpenInfo={handleOpenInfo}
          onRefresh={fetchConversations}
        />
      }
    >
      {/* Modals */}
      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
      {isCreateGroupOpen && <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} onSuccess={handleGroupCreated} />}
      {isCreatePrivateOpen && (
        <CreatePrivateChatModal
          onClose={() => setIsCreatePrivateOpen(false)}
          onSuccess={async (convId) => {
            setIsCreatePrivateOpen(false);
            await fetchConversations();
            setActiveChat(convId);
            setCurrentView('chats');
          }}
        />
      )}

      {/* Dynamic Views */}
      {currentView === 'contacts' ? (
        <div className="flex-1 overflow-y-auto animate-in fade-in slide-in-from-right-2 duration-300">
          <ContactsView onStartChat={handleStartChat} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <ChatArea
            activeChat={activeChat}
            onClose={() => { setActiveChat(null); setIsPanelOpen(false); }}
            onOpenInfo={() => {
              if (activeChatInfo) setIsPanelOpen(p => !p);
            }}
          />
          {isPanelOpen && activeChatInfo && activeChat && (
            <ConversationPanel
              conversationId={activeChat}
              conversationInfo={activeChatInfo}
              currentUserId={user?.sub || ''}
              onClose={() => setIsPanelOpen(false)}
              onConversationAction={() => {
                setIsPanelOpen(false);
                setActiveChat(null);
                fetchConversations();
              }}
            />
          )}
        </div>
      )}
    </ChatLayout>
  );
};

export default ChatPage;
