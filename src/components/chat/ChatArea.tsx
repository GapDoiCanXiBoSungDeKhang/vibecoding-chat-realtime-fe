import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Phone, Video, MoreVertical, Loader2 } from 'lucide-react';
import { messageService } from '../../services/messageService';
import { conversationService } from '../../services/conversationService';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';

interface ChatAreaProps {
  activeChat: string | null;
}

const ChatArea: React.FC<ChatAreaProps> = ({ activeChat }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationInfo, setConversationInfo] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, [messages]);

  const fetchChatData = async () => {
    setIsLoading(true);
    try {
      const [infoData, messagesData] = await Promise.all([
        conversationService.getConversationInfo(activeChat!),
        messageService.getMessages(activeChat!, 50)
      ]);
      setConversationInfo(infoData);
      // Backend typically returns older messages first or paginated. Assuming array format.
      setMessages(messagesData.messages || messagesData); 
    } catch (error) {
      toast.error('Không thể tải dữ liệu cuộc trò chuyện');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    setIsSending(true);
    try {
      const sentMsg = await messageService.sendMessage(activeChat, newMessage);
      // Optimistically append message or re-fetch. Here we append:
      setMessages(prev => [...prev, sentMsg]);
      setNewMessage('');
    } catch (error) {
      toast.error('Không thể gửi tin nhắn');
    } finally {
      setIsSending(false);
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
    <div className="flex flex-col h-full bg-[#e5efff]/30">
      {/* Header */}
      <header className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Avatar name={conversationInfo?.name || 'Chat'} size="md" />
          <div>
            <h2 className="font-bold text-gray-900 text-base">{conversationInfo?.name || 'Đang tải...'}</h2>
            <div className="text-xs text-green-500 font-medium">Vừa mới truy cập</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><Phone size={20} /></button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><Video size={20} /></button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"><MoreVertical size={20} /></button>
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
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
