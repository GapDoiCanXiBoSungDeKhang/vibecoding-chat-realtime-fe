import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

interface UseConversationSocketOptions {
  onUpdate: () => void;
  onJoinRequested?: (payload: any) => void;
}

export const useConversationSocket = (
  onUpdateOrOptions: (() => void) | UseConversationSocketOptions
) => {
  const { socket, joinConversation } = useSocket();

  // Dùng ref để tránh stale closure — callback luôn là phiên bản mới nhất
  // mà không cần re-register socket listener mỗi lần render
  const onUpdateRef = useRef<() => void>(() => {});
  const onJoinRequestedRef = useRef<((payload: any) => void) | undefined>(undefined);

  useEffect(() => {
    onUpdateRef.current =
      typeof onUpdateOrOptions === 'function'
        ? onUpdateOrOptions
        : onUpdateOrOptions.onUpdate;

    onJoinRequestedRef.current =
      typeof onUpdateOrOptions === 'object'
        ? onUpdateOrOptions.onJoinRequested
        : undefined;
  });

  useEffect(() => {
    if (!socket) return;

    const generalEvents = [
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
      'message_seen',
    ];

    const handleEvent = (payload?: any) => {
      onUpdateRef.current();
      const conversationId =
        payload?.conversationId ||
        payload?.conversation?._id ||
        payload?.payload?.message?.conversationId ||
        payload?.payload?.conversationId;
      if (conversationId) {
        joinConversation(conversationId);
      }
    };

    const handleJoinRequested = (payload?: any) => {
      console.log('[Socket] group_join_requested received:', payload);
      handleEvent(payload);
      onJoinRequestedRef.current?.(payload);
    };

    generalEvents.forEach(event => socket.on(event, handleEvent));
    socket.on('group_join_requested', handleJoinRequested);

    return () => {
      generalEvents.forEach(event => socket.off(event, handleEvent));
      socket.off('group_join_requested', handleJoinRequested);
    };
  // Chỉ depend vào socket — không depend vào callbacks (dùng ref thay thế)
  }, [socket, joinConversation]);
};