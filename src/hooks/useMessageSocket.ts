import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';

interface UseMessageSocketProps {
  activeChat: string | null;
  currentUserId?: string;
  onNewMessage: (message: any) => void;
  onConversationUpdate: () => void;
}

export const useMessageSocket = ({ activeChat, currentUserId, onNewMessage, onConversationUpdate }: UseMessageSocketProps) => {
  const { socket, joinConversation, leaveConversation, emitTypingStart, emitTypingStop } = useSocket();
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeChat) {
      joinConversation(activeChat);

      if (socket) {
        socket.on('new_message', (payload) => {
          if (payload.conversationId === activeChat) {
            onNewMessage(payload);
          }
        });

        socket.on('user_typing', (payload) => {
          if (payload.conversationId === activeChat && payload.userId !== currentUserId) {
            setIsTyping(true);
          }
        });

        socket.on('user_stopped_typing', (payload) => {
          if (payload.conversationId === activeChat && payload.userId !== currentUserId) {
            setIsTyping(false);
          }
        });

        const handleGroupUpdate = (payload: any) => {
          if (payload.conversationId === activeChat) {
            onConversationUpdate();
          }
        };

        socket.on('group_member_added', handleGroupUpdate);
        socket.on('group_member_removed', handleGroupUpdate);
        socket.on('group_member_left', handleGroupUpdate);
        socket.on('group_role_changed', handleGroupUpdate);
      }
    }

    return () => {
      if (activeChat) {
        leaveConversation(activeChat);
        if (socket) {
          socket.off('new_message');
          socket.off('user_typing');
          socket.off('user_stopped_typing');
          socket.off('group_member_added');
          socket.off('group_member_removed');
          socket.off('group_member_left');
          socket.off('group_role_changed');
        }
      }
    };
  }, [activeChat, socket, currentUserId]);

  const notifyTyping = () => {
    if (activeChat) {
      emitTypingStart(activeChat);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = window.setTimeout(() => {
        emitTypingStop(activeChat);
      }, 1500);
    }
  };

  const stopTyping = () => {
    if (activeChat) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      emitTypingStop(activeChat);
    }
  };

  return { isTyping, notifyTyping, stopTyping };
};
