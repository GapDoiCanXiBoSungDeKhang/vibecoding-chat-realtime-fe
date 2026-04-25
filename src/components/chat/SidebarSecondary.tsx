import React from 'react';
import { Search, Plus, MessageCircle, Users as UsersIcon } from 'lucide-react';
import Avatar from '../ui/Avatar';

interface SidebarSecondaryProps {
  currentView: 'chats' | 'contacts';
  conversations: any[];
  isLoading: boolean;
  onSelectChat: (id: string) => void;
  activeChatId: string | null;
  onCreateGroup?: () => void;
}

const SidebarSecondary: React.FC<SidebarSecondaryProps> = ({ 
  currentView, 
  conversations, 
  isLoading, 
  onSelectChat,
  activeChatId,
  onCreateGroup
}) => {
  return (
    <aside className="w-72 h-full bg-[#f7f7f7] border-r border-gray-200 flex flex-col flex-shrink-0 animate-in slide-in-from-left duration-300">
      {/* Search Header */}
      <div className="p-3 flex gap-2">
        <div className="flex-1 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={14} />
          <input 
            type="text" 
            placeholder="Tìm kiếm" 
            className="w-full pl-9 pr-3 py-1.5 bg-gray-200/60 rounded text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all border border-transparent focus:border-blue-200"
          />
        </div>
        <button 
          onClick={onCreateGroup}
          className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-all bg-white/50 border border-gray-200 shadow-sm"
          title="Tạo nhóm"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto">
        {currentView === 'chats' ? (
          <div className="py-2">
            <div className="px-5 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Trò chuyện gần đây</div>
            {isLoading ? (
              <div className="p-10 text-center flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-gray-400 text-[10px]">Đang tải...</span>
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((conv) => (
                <div 
                  key={conv._id} 
                  onClick={() => onSelectChat(conv._id)}
                  className={`px-4 py-2.5 cursor-pointer flex gap-3 items-center transition-all group ${activeChatId === conv._id ? 'bg-[#e5efff]' : 'hover:bg-gray-200/80'}`}
                >
                  <Avatar name={conv.name} size="md" />
                  <div className="flex-1 overflow-hidden">
                    <div className={`text-sm truncate ${activeChatId === conv._id ? 'font-bold text-blue-800' : 'font-medium text-gray-800'}`}>
                      {conv.name}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate mt-0.5">
                      {conv.lastMessage?.content || 'Chưa có tin nhắn'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-xs italic">Không tìm thấy cuộc trò chuyện.</div>
            )}
          </div>
        ) : (
          <div className="py-2 space-y-0.5 px-2">
             <div className="px-3 py-3 bg-[#e5efff] text-blue-600 cursor-pointer flex items-center gap-3 rounded-xl transition-all">
                <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                  <UsersIcon size={16} />
                </div>
                <span className="font-bold text-xs">Danh sách bạn bè</span>
              </div>
              <div className="px-3 py-3 hover:bg-gray-200/60 cursor-pointer flex items-center gap-3 rounded-xl transition-all group">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageCircle size={16} />
                </div>
                <span className="font-bold text-xs text-gray-600">Danh sách nhóm</span>
              </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidebarSecondary;
