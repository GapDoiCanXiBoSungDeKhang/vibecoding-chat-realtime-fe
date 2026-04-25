import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Settings, LogOut, Search, Plus, MessageCircle, User, Cloud, Briefcase } from 'lucide-react';
import { conversationService } from '../services/conversationService';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ContactsView from '../components/chat/ContactsView';
import SettingsModal from '../components/chat/SettingsModal';

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
      setIsLoading(false);
    } catch (error) {
      toast.error('Failed to load conversations');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
      
      {/* 1. Primary Sidebar (Deep Zalo Blue) */}
      <aside className="w-[58px] h-full bg-[#0068ff] flex flex-col items-center py-4 flex-shrink-0 z-50 shadow-xl">
        {/* User Profile Info Box (Circular) */}
        <div 
          className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 cursor-pointer mb-6 flex items-center justify-center text-white font-bold overflow-hidden hover:scale-105 transition-all shadow-lg group relative"
          onClick={() => setIsSettingsOpen(true)}
          title="Account Settings"
        >
          {user?.name?.charAt(0) || <User size={20} />}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>

        {/* Middle Navigation Boxes */}
        <div className="flex flex-col gap-1 w-full">
          <button 
            onClick={() => setCurrentView('chats')}
            className={`w-full py-3 flex justify-center transition-all relative group ${currentView === 'chats' ? 'bg-[#005ae0] text-white' : 'text-white/70 hover:bg-white/10'}`}
          >
            <MessageSquare size={22} className="group-hover:scale-110 transition-transform" />
            {currentView === 'chats' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />}
          </button>
          <button 
            onClick={() => setCurrentView('contacts')}
            className={`w-full py-3 flex justify-center transition-all relative group ${currentView === 'contacts' ? 'bg-[#005ae0] text-white' : 'text-white/70 hover:bg-white/10'}`}
          >
            <Users size={22} className="group-hover:scale-110 transition-transform" />
            {currentView === 'contacts' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />}
          </button>
        </div>

        {/* Action Icons Box (Bottom) */}
        <div className="mt-auto flex flex-col items-center gap-1 w-full pb-2">
          <button className="w-full py-3 flex justify-center text-white/70 hover:bg-white/10 transition-all group">
            <Cloud size={20} className="group-hover:scale-110 transition-transform" />
          </button>
          <button className="w-full py-3 flex justify-center text-white/70 hover:bg-white/10 transition-all group">
            <Briefcase size={20} className="group-hover:scale-110 transition-transform" />
          </button>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`w-full py-3 flex justify-center transition-all relative group ${isSettingsOpen ? 'bg-[#005ae0] text-white' : 'text-white/70 hover:bg-white/10'}`}
          >
            <Settings size={22} className="group-hover:rotate-90 transition-all duration-500" />
          </button>
          
          <button 
            onClick={logout}
            className="w-full py-3 flex justify-center text-white/70 hover:bg-red-500/30 hover:text-red-100 transition-all group"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* 2. Secondary Navigation Sidebar (Light Gray) */}
      <aside className="w-72 h-full bg-[#f7f7f7] border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-3 flex gap-2">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={14} />
            <input 
              type="text" 
              placeholder="Tìm kiếm" 
              className="w-full pl-9 pr-3 py-1.5 bg-gray-200/60 rounded text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          <button className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-all bg-white/50 border border-gray-200 shadow-sm">
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {currentView === 'chats' ? (
            <div className="py-2">
              <div className="px-5 py-3 text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Recent Chats</div>
              {isLoading ? (
                <div className="p-10 text-center flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-gray-400 text-sm">Loading...</span>
                </div>
              ) : conversations.length > 0 ? (
                conversations.map((conv) => (
                  <div key={conv._id} className="px-4 py-3 hover:bg-gray-200/80 cursor-pointer flex gap-4 items-center transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 shadow-sm group-hover:scale-105 transition-transform">
                      {conv.name?.charAt(0)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="font-bold text-sm text-gray-800">{conv.name}</div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">No messages yet</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-gray-400 text-sm italic">No conversations found.</div>
              )}
            </div>
          ) : (
            <div className="py-2 space-y-1">
              <div 
                className="px-4 py-4 hover:bg-[#e5efff] cursor-pointer flex items-center gap-4 group transition-all mx-2 rounded-xl"
                onClick={() => {}}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                  <Users size={20} />
                </div>
                <span className="font-bold text-gray-700">Danh sách bạn bè</span>
              </div>
              <div className="px-4 py-4 hover:bg-gray-200/60 cursor-pointer flex items-center gap-4 transition-all mx-2 rounded-xl group">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle size={20} />
                </div>
                <span className="font-bold text-gray-700">Danh sách nhóm</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 3. Main Content Area (White) */}
      <main className="flex-1 h-full relative bg-white flex flex-col overflow-hidden">
        {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
        
        {currentView === 'contacts' ? (
          <div className="flex-1 overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-500">
            <ContactsView />
          </div>
        ) : activeChat ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="font-medium">Chatting with {activeChat}</p>
            <span className="text-xs">Real-time messaging active</span>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white animate-in zoom-in-95 duration-700">
            <div className="w-80 h-80 mb-10 drop-shadow-2xl">
               <img 
                 src="https://zalo-static.zadn.vn/zalo-pc/static/media/empty-state.39265f24.png" 
                 alt="Welcome" 
                 className="w-full h-full object-contain opacity-90" 
               />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-6">Chào mừng bạn đến với Zalo PC!</h2>
            <p className="text-gray-500 max-w-lg text-lg leading-relaxed">
              Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hóa cho máy tính của bạn.
            </p>
            <div className="mt-12 flex gap-4">
              <div className="px-6 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-bold border border-blue-100">Cá nhân hóa</div>
              <div className="px-6 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-bold border border-blue-100">Bảo mật cao</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatPage;
