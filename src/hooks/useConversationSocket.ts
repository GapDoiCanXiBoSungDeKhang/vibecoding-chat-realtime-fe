import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export const useConversationSocket = (onUpdate: () => void) => {
  const { socket, joinConversation } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const events = [
      'group_created',
      'group_added',
      'group_removed',
      'group_left_self',
      'group_dissolved',
      'group_request_added',
      'new_message',
      'new_message_file',
      'new_message_media',
      'message_seen'
    ];

    const handleEvent = (payload?: any) => {
      onUpdate();
      // If a new conversation is detected, ensure we join its room for global notifications
      const conversationId = payload?.conversation?._id || payload?.conversationId;
      if (conversationId) {
        joinConversation(conversationId);
      }
    };

    events.forEach(event => {
      socket.on(event, handleEvent);
    });

    return () => {
      events.forEach(event => {
        socket.off(event, handleEvent);
      });
    };
  }, [socket, onUpdate, joinConversation]);
};
