import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export const useConversationSocket = (onUpdate: () => void) => {
  const { socket } = useSocket();

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

    events.forEach(event => {
      socket.on(event, onUpdate);
    });

    return () => {
      events.forEach(event => {
        socket.off(event, onUpdate);
      });
    };
  }, [socket, onUpdate]);
};
