import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Phone, Video, MoreVertical, Loader2 } from 'lucide-react';
import { messageService } from '../../services/messageService';
import { conversationService } from '../../services/conversationService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';
import { useMessageSocket } from '../../hooks/useMessageSocket';

interface ChatAreaProps {
  activeChat: string | null;
  onClose?: () => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ activeChat, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationInfo, setConversationInfo] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isTyping, notifyTyping, stopTyping } = useMessageSocket({
    activeChat,
    currentUserId: user?.sub,
    onNewMessage: (payload) => setMessages(prev => [...prev, payload]),
    onConversationUpdate: () => fetchChatData()
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeChat) {
      fetchChatData();
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const fetchChatData = async () => {
    setIsLoading(true);
    try {
      const [infoData, messagesData] = await Promise.all([
        conversationService.getConversationInfo(activeChat!),
        messageService.getMessages(activeChat!, 50)
      ]);
      setConversationInfo(infoData);
      setMessages(messagesData.messages || messagesData); 
    } catch (error) {
      toast.error('Không thể tải dữ liệu cuộc trò chuyện');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    notifyTyping();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    stopTyping();

    setIsSending(true);
    try {
      const sentMsg = await messageService.sendMessage(activeChat, newMessage);
      setNewMessage('');
    } catch (error) {
      toast.error('Không thể gửi tin nhắn');
    } finally {
      setIsSending(false);
    }
  };

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Calculate Header Info dynamically
  const isPrivate = conversationInfo?.type === 'private';
  let headerName = conversationInfo?.name;
  if (isPrivate && conversationInfo?.participants) {
    const other = conversationInfo.participants.find((p: any) => p.userId?._id !== user?.sub)?.userId;
    headerName = other?.name || 'Người dùng';
  }

  const currentUserRole = conversationInfo?.participants?.find((p: any) => p.userId?._id === user?.sub)?.role;

  const handleLeaveGroup = async () => {
    try {
      await conversationService.leaveGroup(user!.sub, user!.name, activeChat!);
      toast.success('Đã rời khỏi nhóm');
      setIsDropdownOpen(false);
      onClose && onClose();
    } catch (e) {
      toast.error('Không thể rời nhóm');
    }
  };

  const handleDisbandGroup = async () => {
    try {
      await conversationService.disbandGroup(user!.sub, activeChat!);
      toast.success('Đã giải tán nhóm');
      setIsDropdownOpen(false);
      onClose && onClose();
    } catch (e) {
      toast.error('Không thể giải tán nhóm');
    }
  };

  const handleDeleteChat = async () => {
    try {
      await conversationService.removeConversation(activeChat!);
      toast.success('Đã xóa trò chuyện');
      setIsDropdownOpen(false);
      onClose && onClose();
    } catch (e) {
      toast.error('Không thể xóa trò chuyện');
    }
  };

  if (!activeChat) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white animate-in zoom-in-95 duration-700">
        <div className="w-64 h-64 mb-8 drop-shadow-2xl">
           <img 
             src="https://zalo-static.zadn.vn/zalo-pc/static/media/empty-state.39265f24.png" 
             alt="Welcome" 
             className="w-full h-full object-contain opacity-90" 
           />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-4">Chào mừng bạn đến với Zalo Hybrid!</h2>
        <p className="text-gray-500 max-w-md text-base leading-relaxed">
          Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hóa cho máy tính của bạn.
        </p>
        <div className="mt-10 flex gap-3">
          <div className="px-5 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">Cá nhân hóa</div>
          <div className="px-5 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">Bảo mật cao</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#e5efff]/30 relative">
      {/* Header */}
      <header className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-4">
          <Avatar name={headerName || 'Chat'} size="md" />
          <div>
            <h2 className="font-bold text-gray-900 text-base">{headerName || 'Đang tải...'}</h2>
            <div className="text-xs text-green-500 font-medium">Vừa mới truy cập</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><Phone size={20} /></button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><Video size={20} /></button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical size={20} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95">
                {conversationInfo?.type === 'group' && (
                  <>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Thêm thành viên
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Quản lý thành viên
                    </button>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button 
                      onClick={handleLeaveGroup}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Rời nhóm
                    </button>
                    {currentUserRole === 'owner' && (
                      <button 
                        onClick={handleDisbandGroup}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold transition-colors"
                      >
                        Giải tán nhóm
                      </button>
                    )}
                  </>
                )}
                {isPrivate && (
                  <button 
                    onClick={handleDeleteChat}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Xóa trò chuyện
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>Bắt đầu cuộc trò chuyện ngay!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.sender?._id === user?.sub || msg.senderId === user?.sub;
            return (
              <div key={msg._id || index} className={`flex w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] flex gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMine && (
                    <Avatar name={msg.sender?.name || 'User'} size="sm" className="mt-auto shadow-sm" />
                  )}
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {!isMine && <span className="text-[10px] text-gray-500 ml-1 mb-1">{msg.sender?.name}</span>}
                    <div 
                      className={`px-4 py-2.5 rounded-2xl shadow-sm text-[14px] ${
                        isMine 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isTyping && (
          <div className="flex w-full justify-start mt-2">
            <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-gray-100 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input 
            type="text" 
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Nhập tin nhắn tới bạn bè..." 
            className="flex-1 px-4 py-3 bg-gray-100 focus:bg-white rounded-xl border border-transparent focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-[14px]"
            disabled={isSending}
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl transition-all shadow-md active:scale-95"
          >
            {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
