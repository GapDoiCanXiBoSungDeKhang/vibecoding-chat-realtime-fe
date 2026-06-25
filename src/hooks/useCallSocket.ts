import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

export type CallType = 'voice' | 'video';
export type CallState = 'idle' | 'calling' | 'incoming' | 'connected';

export interface CallPayload {
  callId: string;
  callerId?: string;
  callerInfo?: { name: string; avatar?: string | null };
  callType: CallType;
  conversationId?: string;
}

interface UseCallSocketOptions {
  onIncoming: (payload: CallPayload) => void;
  onAccepted: (payload: { callId: string }) => void;
  onRejected: (payload: { callId: string; reasons?: string }) => void;
  onEnded: (payload: { callId: string }) => void;
  onCancelled: (payload: { callId: string }) => void;
  onBusy: (payload: { callId: string }) => void;
  onOffer: (payload: { callId: string; fromUserId: string; sdp: RTCSessionDescriptionInit }) => void;
  onAnswer: (payload: { callId: string; fromUserId: string; sdp: RTCSessionDescriptionInit }) => void;
  onIceCandidate: (payload: { callId: string; fromUserId: string; candidate: RTCIceCandidateInit }) => void;
}

export const useCallSocket = (options: UseCallSocketOptions) => {
  const { socket } = useSocket();
  const optsRef = useRef(options);
  useEffect(() => { optsRef.current = options; });

  // Emit helpers
  const initiateCall = useCallback((calleId: string, conversationId: string, callType: CallType) => {
    socket?.emit('call_initiate', { calleId, conversationId, callType });
  }, [socket]);

  const acceptCall = useCallback((callId: string) => {
    socket?.emit('call_accept', { callId });
  }, [socket]);

  const rejectCall = useCallback((callId: string, reasons?: string) => {
    socket?.emit('call_reject', { callId, reasons });
  }, [socket]);

  const endCall = useCallback((callId: string) => {
    socket?.emit('call_end', { callId });
  }, [socket]);

  const cancelCall = useCallback((callId: string) => {
    socket?.emit('call_cancel', { callId });
  }, [socket]);

  const sendOffer = useCallback((callId: string, targetUserId: string, sdp: RTCSessionDescriptionInit) => {
    socket?.emit('call_offer', { callId, targetUserId, sdp });
  }, [socket]);

  const sendAnswer = useCallback((callId: string, targetUserId: string, sdp: RTCSessionDescriptionInit) => {
    socket?.emit('call_answer', { callId, targetUserId, sdp });
  }, [socket]);

  const sendIceCandidate = useCallback((callId: string, targetUserId: string, candidate: RTCIceCandidateInit) => {
    socket?.emit('call_ice_candidate', { callId, targetUserId, candidate });
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handlers: Record<string, (p: any) => void> = {
      call_initiated: (p) => optsRef.current.onIncoming(p),
      call_accepted: (p) => optsRef.current.onAccepted(p),
      call_rejected: (p) => optsRef.current.onRejected(p),
      call_ended: (p) => optsRef.current.onEnded(p),
      call_cancelled: (p) => optsRef.current.onCancelled(p),
      call_busy: (p) => optsRef.current.onBusy(p),
      call_offer: (p) => optsRef.current.onOffer(p),
      call_answer: (p) => optsRef.current.onAnswer(p),
      call_ice_candidate: (p) => optsRef.current.onIceCandidate(p),
    };

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler));
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [socket]);

  return { initiateCall, acceptCall, rejectCall, endCall, cancelCall, sendOffer, sendAnswer, sendIceCandidate };
};
