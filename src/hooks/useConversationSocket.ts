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
      'group_member_added',
      'group_member_removed',
      'group_member_left',
      'group_role_changed',
      'group_request_handled',
      'conversation_updated',
      'message_seen'
    ];

    const handleEvent = (payload?: any) => {
      onUpdate();
      // If a new conversation is detected, ensure we join its room for global notifications
      const conversationId = 
        payload?.conversationId || 
        payload?.conversation?._id || 
        payload?.payload?.message?.conversationId || 
        payload?.payload?.conversationId;
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
