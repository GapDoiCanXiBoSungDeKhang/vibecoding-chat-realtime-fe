import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, Users as UsersIcon, LogOut, Trash2 } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { conversationService } from '../../services/conversationService';
import toast from 'react-hot-toast';

interface SidebarSecondaryProps {
  currentView: 'chats' | 'contacts';
  conversations: any[];
  isLoading: boolean;
  onSelectChat: (id: string) => void;
  activeChatId: string | null;
  onCreateGroup?: () => void;
  onCreatePrivate?: () => void;
  currentUserId: string;
}

const SidebarSecondary: React.FC<SidebarSecondaryProps> = ({ 
  currentView, 
  conversations, 
  isLoading, 
  onSelectChat,
  activeChatId,
  onCreateGroup,
  onCreatePrivate,
  currentUserId
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, conv: any } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, conv: any) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, conv });
  };

  const handleAction = async (action: 'leave' | 'disband' | 'delete', conv: any) => {
    try {
      if (action === 'leave') {
        await conversationService.leaveGroup(currentUserId, 'User', conv._id);
        toast.success('Đã rời khỏi nhóm');
      } else if (action === 'disband') {
        await conversationService.disbandGroup(currentUserId, conv._id);
        toast.success('Đã giải tán nhóm');
      } else if (action === 'delete') {
        await conversationService.removeConversation(conv._id);
        toast.success('Đã xóa trò chuyện');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  return (
    <aside className="w-72 h-full bg-[#f7f7f7] border-r border-gray-200 flex flex-col flex-shrink-0 animate-in slide-in-from-left duration-300 relative">
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
        <div className="flex gap-1">
          <button 
            onClick={onCreatePrivate}
            className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-all bg-white/50 border border-gray-200 shadow-sm"
            title="Nhắn tin mới"
          >
            <MessageCircle size={15} />
          </button>
          <button 
            onClick={onCreateGroup}
            className="p-1.5 hover:bg-blue-100 rounded text-blue-600 transition-all bg-white/50 border border-gray-200 shadow-sm"
            title="Tạo nhóm"
          >
            <UsersIcon size={15} />
          </button>
        </div>
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
              conversations.map((conv) => {
                const isPrivate = conv.type === 'private';
                let convName = conv.name;
                if (isPrivate && conv.participants) {
                  const other = conv.participants.find((p: any) => p.userId?._id !== currentUserId)?.userId;
                  convName = other?.name || 'Người dùng';
                }

                return (
                  <div 
                    key={conv._id} 
                    onClick={() => onSelectChat(conv._id)}
                    onContextMenu={(e) => handleContextMenu(e, conv)}
                    className={`px-4 py-2.5 cursor-pointer flex gap-3 items-center transition-all group ${activeChatId === conv._id ? 'bg-[#e5efff]' : 'hover:bg-gray-200/80'}`}
                  >
                    <Avatar name={convName} size="md" />
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-0.5">
                        <div className={`text-sm truncate ${activeChatId === conv._id ? 'font-bold text-blue-800' : 'font-medium text-gray-800'}`}>
                          {convName}
                        </div>
                        {conv.unreadCount > 0 && (
                          <div className="w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                            {conv.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className={`text-[11px] truncate ${conv.unreadCount > 0 ? 'text-gray-800 font-bold' : 'text-gray-500'}`}>
                        {conv.lastMessage?.content || 'Chưa có tin nhắn'}
                      </div>
                    </div>
                  </div>
                );
              })
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

      {contextMenu && (
        <div 
          className="fixed bg-white border border-gray-200 shadow-xl rounded-xl w-48 py-1 z-50 animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.conv.type === 'group' ? (
            <>
              <button 
                onClick={() => handleAction('leave', contextMenu.conv)}
                className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <LogOut size={14} /> Rời nhóm
              </button>
              {contextMenu.conv.participants?.find((p: any) => p.userId?._id === currentUserId)?.role === 'owner' && (
                <button 
                  onClick={() => handleAction('disband', contextMenu.conv)}
                  className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold transition-colors"
                >
                  <Trash2 size={14} /> Giải tán nhóm
                </button>
              )}
            </>
          ) : (
            <button 
              onClick={() => handleAction('delete', contextMenu.conv)}
              className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={14} /> Xóa trò chuyện
            </button>
          )}
        </div>
      )}
    </aside>
  );
};

export default SidebarSecondary;
