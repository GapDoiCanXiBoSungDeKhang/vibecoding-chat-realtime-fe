import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export const useGlobalNotifications = (activeChatId: string | null, onSelectChat?: (id: string) => void) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (payload: any) => {
      const msg = payload.message || payload;
      const conversationId = msg.conversationId?.toString() || msg.conversationId;
      const senderId = (msg.senderId?._id || msg.senderId)?.toString();

      // Only show notification if:
      // 1. Message is not from current user
      // 2. User is not currently in the conversation room
      if (senderId !== user.sub && conversationId !== activeChatId) {
        const senderName = msg.senderId?.name || 'Ai đó';
        const content = msg.type === 'text' ? msg.content : `Đã gửi một ${msg.type}`;
        
        toast((t) => (
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-bold text-sm">{senderName}</span>
              <span className="text-xs text-gray-500 truncate max-w-[200px]">{content}</span>
            </div>
            <button 
              onClick={() => {
                toast.dismiss(t.id);
                if (onSelectChat) onSelectChat(conversationId);
              }}
              className="ml-auto text-blue-500 text-xs font-bold hover:underline"
            >
              Xem
            </button>
          </div>
        ), {
          duration: 4000,
          position: 'top-right',
        });
      }
    };

    const events = [
      'new_message',
      'new_message_file',
      'new_message_media',
      'new_message_voice',
      'new_message_linkPreview',
      'new_message_call',
    ];

    events.forEach(event => socket.on(event, handleNewMessage));

    return () => {
      events.forEach(event => socket.off(event, handleNewMessage));
    };
  }, [socket, user, activeChatId]);
};
