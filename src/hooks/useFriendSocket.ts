import { useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

interface UseFriendSocketOptions {
  onUpdate: () => void;
  onAccepted?: (conversationId: string, friendName: string) => void;
  onReceived?: () => void; // NEW: callback khi B nhận friend request
}

export const useFriendSocket = (
  onUpdateOrOptions: (() => void) | UseFriendSocketOptions
) => {
  const { socket } = useSocket();

  const onUpdate =
    typeof onUpdateOrOptions === 'function'
      ? onUpdateOrOptions
      : onUpdateOrOptions.onUpdate;

  const onAccepted =
    typeof onUpdateOrOptions === 'object'
      ? onUpdateOrOptions.onAccepted
      : undefined;

  const onReceived =
    typeof onUpdateOrOptions === 'object'
      ? onUpdateOrOptions.onReceived
      : undefined;

  const stableOnUpdate = useCallback(onUpdate, []);

  useEffect(() => {
    if (!socket) return;

    const handleReceived = (payload: any) => {
      const senderName = payload?.request?.from?.name || 'Ai đó';
      const message = payload?.request?.message;
      const body = message ? `"${message}"` : 'Đã gửi lời mời kết bạn';

      toast(`👋 ${senderName}: ${body}`, {
        duration: 5000,
        style: { minWidth: '260px' },
      });

      stableOnUpdate();
      onReceived?.(); // NEW
    };

    const handleAccepted = (payload: any) => {
      const friendName = payload?.friend?.name || 'Bạn bè';
      const conversationId = payload?.conversationId;

      toast.success(`${friendName} đã chấp nhận lời mời kết bạn!`, {
        duration: 5000,
        icon: '🎉',
      });

      stableOnUpdate();

      if (conversationId && onAccepted) {
        onAccepted(conversationId, friendName);
      }
    };

    const handleRejected = () => {
      stableOnUpdate();
    };

    socket.on('friend_request_received', handleReceived);
    socket.on('friend_request_accepted', handleAccepted);
    socket.on('friend_request_rejected', handleRejected);

    return () => {
      socket.off('friend_request_received', handleReceived);
      socket.off('friend_request_accepted', handleAccepted);
      socket.off('friend_request_rejected', handleRejected);
    };
  }, [socket, stableOnUpdate, onAccepted, onReceived]);
};