import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Phone, PhoneOff, PhoneMissed, Video, VideoOff,
  Mic, MicOff, Volume2, VolumeX, Loader2,
} from 'lucide-react';
import { useCallSocket } from '../../hooks/useCallSocket';
import type { CallType, CallPayload } from '../../hooks/useCallSocket';
import toast from 'react-hot-toast';

interface IncomingInfo {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  callType: CallType;
  conversationId: string;
}

interface CallModalProps {
  outgoing?: {
    calleId: string;
    calleeName: string;
    calleeAvatar?: string | null;
    conversationId: string;
    callType: CallType;
  };
  incoming?: IncomingInfo;
  onClose: () => void;
}

type Phase = 'calling' | 'incoming' | 'connecting' | 'connected' | 'ended';

const CallModal: React.FC<CallModalProps> = ({ outgoing, incoming, onClose }) => {
  const [phase, setPhase] = useState<Phase>(outgoing ? 'calling' : 'incoming');
  const [_callId, setCallId] = useState('');
  const [callType, _setCallType] = useState<CallType>(outgoing?.callType ?? incoming?.callType ?? 'voice');
  const [incomingPayload, _setIncomingPayload] = useState<CallPayload | null>(
    incoming ? {
      callId: incoming.callId,
      callerId: incoming.callerId,
      callerInfo: { name: incoming.callerName, avatar: incoming.callerAvatar },
      callType: incoming.callType,
      conversationId: incoming.conversationId,
    } : null
  );
  const [_remoteUserId, setRemoteUserId] = useState(outgoing?.calleId ?? incoming?.callerId ?? '');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  // Dùng ref để tránh stale closure trong socket handlers
  const callIdRef      = useRef('');
  const phaseRef       = useRef<Phase>(outgoing ? 'calling' : 'incoming');
  const remoteUserRef  = useRef(outgoing?.calleId ?? '');

  const setPhaseSync = (p: Phase) => { phaseRef.current = p; setPhase(p); };
  const setCallIdSync = (id: string) => { callIdRef.current = id; setCallId(id); };
  const setRemoteSync = (id: string) => { remoteUserRef.current = id; setRemoteUserId(id); };

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidates.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const formatDuration = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // ── WebRTC ────────────────────────────────────────────────────────────────
  const getLocalStream = useCallback(async (type: CallType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      return stream;
    } catch {
      toast.error('Không thể truy cập micro/camera');
      return null;
    }
  }, []);

  const createPeer = useCallback((
    stream: MediaStream,
    onIce: (c: RTCIceCandidate) => void
  ) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = e => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };
    pc.onicecandidate = e => { if (e.candidate) onIce(e.candidate); };
    pcRef.current = pc;
    return pc;
  }, []);

  const flushCandidates = useCallback(async () => {
    if (!pcRef.current) return;
    for (const c of pendingCandidates.current) {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    pendingCandidates.current = [];
  }, []);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }, []);

  // ── Socket ────────────────────────────────────────────────────────────────
  const { initiateCall, acceptCall, rejectCall, endCall, cancelCall,
    sendOffer, sendAnswer, sendIceCandidate } = useCallSocket({

    // Caller nhận callId từ BE ngay sau khi initiate
    onStarted: ({ callId: cid }) => {
      setCallIdSync(cid);
    },

    // Không xử lý incoming ở đây — ChatPage xử lý toàn cục
    onIncoming: () => {},

    // Callee accept → caller bắt đầu offer
    onAccepted: async ({ callId: cid }) => {
      if (phaseRef.current !== 'calling') return;
      setCallIdSync(cid);
      setPhaseSync('connecting');

      const stream = await getLocalStream(callType);
      if (!stream) return;

      const pc = createPeer(stream, (c) => {
        sendIceCandidate(cid, remoteUserRef.current, c.toJSON());
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendOffer(cid, remoteUserRef.current, offer);
    },

    onRejected: ({ reasons }) => {
      toast(reasons ? `Bị từ chối: ${reasons}` : 'Cuộc gọi bị từ chối', { icon: '📵' });
      cleanup();
      setPhaseSync('ended');
      setTimeout(onClose, 1200);
    },

    onEnded: () => {
      cleanup();
      setPhaseSync('ended');
      setTimeout(onClose, 1200);
    },

    onCancelled: () => {
      // Callee nhận — caller đã huỷ
      toast('Cuộc gọi bị huỷ', { icon: '📵' });
      cleanup();
      onClose();
    },

    onBusy: () => {
      toast.error('Người dùng đang bận');
      cleanup();
      onClose();
    },

    // Callee nhận offer → tạo answer
    onOffer: async ({ callId: cid, fromUserId, sdp }) => {
      if (phaseRef.current !== 'incoming' && phaseRef.current !== 'connecting') return;
      setCallIdSync(cid);
      setRemoteSync(fromUserId);
      setPhaseSync('connecting');

      const stream = await getLocalStream(callType);
      if (!stream) return;

      const pc = createPeer(stream, (c) => {
        sendIceCandidate(cid, fromUserId, c.toJSON());
      });

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendAnswer(cid, fromUserId, answer);

      setPhaseSync('connected');
      startTimer();
    },

    // Caller nhận answer
    onAnswer: async ({ sdp }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushCandidates();
      setPhaseSync('connected');
      startTimer();
    },

    onIceCandidate: async ({ candidate }) => {
      if (!pcRef.current?.remoteDescription) {
        pendingCandidates.current.push(candidate);
        return;
      }
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    },
  });

  // ── Mount: initiate nếu outgoing ─────────────────────────────────────────
  useEffect(() => {
    if (outgoing) {
      initiateCall(outgoing.calleId, outgoing.conversationId, outgoing.callType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAccept = () => {
    const cid = incoming?.callId || incomingPayload?.callId;
    const rid = incoming?.callerId || incomingPayload?.callerId || '';
    if (!cid) return;
    acceptCall(cid);
    setCallIdSync(cid);
    setRemoteSync(rid);
    setPhaseSync('connecting');
    // WebRTC bắt đầu khi nhận onOffer
  };

  const handleReject = () => {
    const cid = callIdRef.current || incomingPayload?.callId || '';
    if (cid) rejectCall(cid);
    cleanup();
    onClose();
  };

  const handleEnd = () => {
    const cid = callIdRef.current;
    if (phaseRef.current === 'calling') {
      if (cid) cancelCall(cid);
    } else {
      if (cid) endCall(cid);
    }
    cleanup();
    setPhaseSync('ended');
    setTimeout(onClose, 800);
  };

  // ── Set incoming payload khi render lần đầu (incoming mode) ──────────────
  // ChatPage truyền incomingPayload qua prop
  // Nhưng CallModal đang listen tất cả events → cần receive incoming từ prop
  // (xem ChatPage truyền xuống)

  // ── Toggles ───────────────────────────────────────────────────────────────
  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(m => !m);
  };
  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = isCamOff; });
    setIsCamOff(c => !c);
  };
  const toggleSpeaker = () => {
    if (remoteVideoRef.current) remoteVideoRef.current.muted = !isSpeakerOff;
    setIsSpeakerOff(s => !s);
  };

  // ── Display ───────────────────────────────────────────────────────────────
  const displayName   = outgoing?.calleeName ?? incoming?.callerName ?? incomingPayload?.callerInfo?.name ?? 'Người dùng';
  const displayAvatar = outgoing?.calleeAvatar ?? incoming?.callerAvatar ?? incomingPayload?.callerInfo?.avatar;

  const phaseLabel: Record<Phase, string> = {
    calling:    'Đang gọi...',
    incoming:   `Cuộc gọi ${callType === 'video' ? 'video' : 'thoại'} đến`,
    connecting: 'Đang kết nối...',
    connected:  formatDuration(duration),
    ended:      'Cuộc gọi kết thúc',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        {/* Remote video background */}
        {callType === 'video' && phase === 'connected' && (
          <video ref={remoteVideoRef} autoPlay playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-80" />
        )}

        <div className="relative z-10 flex flex-col items-center px-6 pt-12 pb-8 min-h-[420px]">
          {/* Avatar */}
          <div className="relative mb-4">
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-xl" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold shadow-xl border-4 border-white/20">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            {(phase === 'calling' || phase === 'incoming') && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />
                <div className="absolute -inset-3 rounded-full border border-white/15 animate-ping [animation-delay:300ms]" />
              </>
            )}
          </div>

          <h2 className="text-xl font-bold mb-1">{displayName}</h2>
          <p className="text-sm text-white/60 mb-2 flex items-center gap-1.5">
            {callType === 'video' ? <Video size={14} /> : <Phone size={14} />}
            {phaseLabel[phase]}
            {phase === 'connecting' && <Loader2 size={14} className="animate-spin ml-1" />}
          </p>

          {/* PiP local video */}
          {callType === 'video' && phase === 'connected' && (
            <div className="absolute top-4 right-4 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg bg-black">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex-1" />

          {/* ── Controls ── */}
          {phase === 'incoming' && (
            <div className="flex items-center justify-center gap-12 mt-4">
              <div className="flex flex-col items-center gap-2">
                <button onClick={handleReject}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all active:scale-95">
                  <PhoneMissed size={26} />
                </button>
                <span className="text-xs text-white/60">Từ chối</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <button onClick={handleAccept}
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-all active:scale-95 animate-bounce">
                  <Phone size={26} />
                </button>
                <span className="text-xs text-white/60">Chấp nhận</span>
              </div>
            </div>
          )}

          {(phase === 'calling' || phase === 'connecting') && (
            <div className="flex flex-col items-center gap-2 mt-4">
              <button onClick={handleEnd}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all active:scale-95">
                <PhoneOff size={26} />
              </button>
              <span className="text-xs text-white/60">{phase === 'calling' ? 'Huỷ' : 'Kết thúc'}</span>
            </div>
          )}

          {phase === 'connected' && (
            <div className="mt-6 w-full">
              <div className="flex justify-center gap-4 mb-6">
                <button onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/80' : 'bg-white/15 hover:bg-white/25'}`}>
                  {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button onClick={toggleSpeaker}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSpeakerOff ? 'bg-red-500/80' : 'bg-white/15 hover:bg-white/25'}`}>
                  {isSpeakerOff ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                {callType === 'video' && (
                  <button onClick={toggleCam}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCamOff ? 'bg-red-500/80' : 'bg-white/15 hover:bg-white/25'}`}>
                    {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
                  </button>
                )}
              </div>
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-2">
                  <button onClick={handleEnd}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all active:scale-95">
                    <PhoneOff size={26} />
                  </button>
                  <span className="text-xs text-white/60">Kết thúc</span>
                </div>
              </div>
            </div>
          )}

          {phase === 'ended' && (
            <p className="text-center text-white/50 text-sm mt-4">Cuộc gọi kết thúc</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;