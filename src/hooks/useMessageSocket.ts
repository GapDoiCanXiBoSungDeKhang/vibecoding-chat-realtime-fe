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
        const messageArrivalEvents = [
          'new_message',
          'new_message_file',
          'new_message_media',
          'new_message_voice',
          'new_message_linkPreview',
          'new_message_call',
          'message_system_room'
        ];

        messageArrivalEvents.forEach(evt => {
          socket.on(evt, (payload) => {
            if (payload.conversationId === activeChat) {
              onNewMessage(payload);
            }
          });
        });

        const messageModificationEvents = [
          'message_edited',
          'message_deleted',
          'message_reacted',
          'message_pinned',
          'message_unpinned',
          'announcement_created'
        ];

        messageModificationEvents.forEach(evt => {
          socket.on(evt, (payload) => {
            if (payload.conversationId === activeChat) {
              onConversationUpdate();
            }
          });
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

        const groupEvents = [
          'group_member_added',
          'group_member_removed',
          'group_member_left',
          'group_role_changed'
        ];

        groupEvents.forEach(evt => socket.on(evt, handleGroupUpdate));
      }
    }

    return () => {
      if (activeChat) {
        leaveConversation(activeChat);
        if (socket) {
          const allEvents = [
            'new_message', 'new_message_file', 'new_message_media', 'new_message_voice', 
            'new_message_linkPreview', 'new_message_call', 'message_system_room',
            'message_edited', 'message_deleted', 'message_reacted', 'message_pinned', 
            'message_unpinned', 'announcement_created',
            'user_typing', 'user_stopped_typing',
            'group_member_added', 'group_member_removed', 'group_member_left', 'group_role_changed'
          ];
          allEvents.forEach(evt => socket.off(evt));
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
