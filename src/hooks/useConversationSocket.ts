import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export const useConversationSocket = (onUpdate: () => void) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('group_created', onUpdate);
    socket.on('group_added', onUpdate);
    socket.on('group_removed', onUpdate);
    socket.on('group_left_self', onUpdate);

    return () => {
      socket.off('group_created', onUpdate);
      socket.off('group_added', onUpdate);
      socket.off('group_removed', onUpdate);
      socket.off('group_left_self', onUpdate);
    };
  }, [socket, onUpdate]);
};
