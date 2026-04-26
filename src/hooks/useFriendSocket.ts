import { useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

interface UseFriendSocketOptions {
  onUpdate: () => void;
  /** Called when user B accepts A's request. Receives the new conversationId so we can open it. */
  onAccepted?: (conversationId: string, friendName: string) => void;
}

export const useFriendSocket = (
  onUpdateOrOptions: (() => void) | UseFriendSocketOptions
) => {
  const { socket } = useSocket();

  // Normalise: allow passing just a callback OR an options object
  const onUpdate =
    typeof onUpdateOrOptions === 'function'
      ? onUpdateOrOptions
      : onUpdateOrOptions.onUpdate;

  const onAccepted =
    typeof onUpdateOrOptions === 'object'
      ? onUpdateOrOptions.onAccepted
      : undefined;

  const stableOnUpdate = useCallback(onUpdate, []);

  useEffect(() => {
    if (!socket) return;

    /**
     * friend_request_received
     * Payload: { request: { _id, from: { _id, name, avatar }, message, createdAt } }
     * Emitted to: user B (the recipient)
     */
    const handleReceived = (payload: any) => {
      const senderName = payload?.request?.from?.name || 'Ai đó';
      const message = payload?.request?.message;
      const body = message ? `"${message}"` : 'Đã gửi lời mời kết bạn';

      toast(`👋 ${senderName}: ${body}`, {
        duration: 5000,
        style: { minWidth: '260px' },
      });

      stableOnUpdate();
    };

    /**
     * friend_request_accepted
     * Payload: { friend: { _id, name, avatar, status }, conversationId }
     * Emitted to: user A (the original sender — their request was just accepted)
     */
    const handleAccepted = (payload: any) => {
      const friendName = payload?.friend?.name || 'Bạn bè';
      const conversationId = payload?.conversationId;

      toast.success(
        `${friendName} đã chấp nhận lời mời kết bạn!`,
        { duration: 5000, icon: '🎉' }
      );

      stableOnUpdate();

      if (conversationId && onAccepted) {
        onAccepted(conversationId, friendName);
      }
    };

    /**
     * friend_request_rejected
     * No meaningful payload — backend doesn't emit to sender on reject.
     * Triggered locally when user B presses reject (optimistic UI update).
     */
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
  }, [socket, stableOnUpdate, onAccepted]);
};
