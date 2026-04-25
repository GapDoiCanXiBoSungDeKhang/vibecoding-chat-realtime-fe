import { useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export const useFriendSocket = (onUpdate: () => void) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on('friend_request_received', onUpdate);
    socket.on('friend_request_accepted', onUpdate);
    socket.on('friend_request_rejected', onUpdate);

    return () => {
      socket.off('friend_request_received', onUpdate);
      socket.off('friend_request_accepted', onUpdate);
      socket.off('friend_request_rejected', onUpdate);
    };
  }, [socket, onUpdate]);
};
