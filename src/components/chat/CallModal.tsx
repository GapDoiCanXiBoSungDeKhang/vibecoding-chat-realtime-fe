import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Phone, PhoneOff, PhoneMissed, Video, VideoOff,
  Mic, MicOff, Volume2, VolumeX, Loader2,
} from 'lucide-react';
import { useCallSocket } from '../../hooks/useCallSocket';
import type { CallType, CallPayload } from '../../hooks/useCallSocket';
import toast from 'react-hot-toast';

interface CallModalProps {
  /** Khi caller muốn gọi: truyền vào. Khi chỉ listen thì để undefined */
  outgoing?: {
    calleId: string;
    calleeName: string;
    calleeAvatar?: string | null;
    conversationId: string;
    callType: CallType;
  };
  onClose: () => void;
}

type Phase = 'calling' | 'incoming' | 'connecting' | 'connected' | 'ended';

const CallModal: React.FC<CallModalProps> = ({ outgoing, onClose }) => {
  const [phase, setPhase] = useState<Phase>(outgoing ? 'calling' : 'incoming');
  const [callId, setCallId] = useState<string>('');
  const [callType, setCallType] = useState<CallType>(outgoing?.callType ?? 'voice');
  const [incomingPayload, setIncomingPayload] = useState<CallPayload | null>(null);
  const [remoteUserId, setRemoteUserId] = useState<string>(outgoing?.calleId ?? '');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // ── helpers ──────────────────────────────────────────────────────────────

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
  }, []);

  const closePeer = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopLocalStream();
    closePeer();
  }, [stopLocalStream, closePeer]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // ── WebRTC setup ──────────────────────────────────────────────────────────

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

  const createPeer = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    pcRef.current = pc;
    return pc;
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    if (!pcRef.current) return;
    for (const c of pendingCandidatesRef.current) {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    pendingCandidatesRef.current = [];
  }, []);

  // ── Socket hook ────────────────────────────────────────────────────────────

  const { initiateCall, acceptCall, rejectCall, endCall, cancelCall,
    sendOffer, sendAnswer, sendIceCandidate } = useCallSocket({

    onIncoming: (payload) => {
      // Nếu modal này đang idle (không outgoing) thì nhận incoming
      if (!outgoing) {
        setIncomingPayload(payload);
        setCallId(payload.callId);
        setCallType(payload.callType);
        setRemoteUserId(payload.callerId ?? '');
        setPhase('incoming');
      }
    },

    onAccepted: async ({ callId: cid }) => {
      // Caller nhận được accepted → bắt đầu WebRTC offer
      setPhase('connecting');
      const stream = await getLocalStream(callType);
      if (!stream) return;
      const pc = createPeer(stream);

      pc.onicecandidate = (e) => {
        if (e.candidate) sendIceCandidate(cid, remoteUserId, e.candidate.toJSON());
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendOffer(cid, remoteUserId, offer);
    },

    onRejected: ({ reasons }) => {
      toast(reasons ? `Bị từ chối: ${reasons}` : 'Cuộc gọi bị từ chối', { icon: '📵' });
      cleanup();
      onClose();
    },

    onEnded: () => {
      setPhase('ended');
      cleanup();
      setTimeout(onClose, 1500);
    },

    onCancelled: () => {
      toast('Cuộc gọi đã bị huỷ', { icon: '📵' });
      cleanup();
      onClose();
    },

    onBusy: () => {
      toast.error('Người dùng đang bận');
      cleanup();
      onClose();
    },

    onOffer: async ({ callId: cid, fromUserId, sdp }) => {
      // Callee nhận offer → tạo answer
      setPhase('connecting');
      const stream = await getLocalStream(callType);
      if (!stream) return;
      const pc = createPeer(stream);

      pc.onicecandidate = (e) => {
        if (e.candidate) sendIceCandidate(cid, fromUserId, e.candidate.toJSON());
      };

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushPendingCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendAnswer(cid, fromUserId, answer);

      setPhase('connected');
      startTimer();
    },

    onAnswer: async ({ sdp }) => {
      // Caller nhận answer
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushPendingCandidates();
      setPhase('connected');
      startTimer();
    },

    onIceCandidate: async ({ candidate }) => {
      if (!pcRef.current || !pcRef.current.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    },
  });

  // ── Mount: nếu outgoing thì initiate ngay ─────────────────────────────────
  useEffect(() => {
    if (outgoing) {
      initiateCall(outgoing.calleId, outgoing.conversationId, outgoing.callType);
    }
    return cleanup;
  }, []);

  // ── Toggle controls ───────────────────────────────────────────────────────
  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = isCamOff; });
    setIsCamOff(!isCamOff);
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) remoteVideoRef.current.muted = !isSpeakerOff;
    setIsSpeakerOff(!isSpeakerOff);
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    if (!incomingPayload) return;
    acceptCall(incomingPayload.callId);
    setPhase('connecting');
    // WebRTC sẽ bắt đầu khi nhận onOffer
  };

  const handleReject = () => {
    if (callId) rejectCall(callId);
    cleanup();
    onClose();
  };

  const handleEnd = () => {
    if (callId) endCall(callId);
    if (phase === 'calling') cancelCall(callId);
    cleanup();
    setPhase('ended');
    setTimeout(onClose, 1000);
  };

  // ── Display info ──────────────────────────────────────────────────────────
  const displayName = outgoing?.calleeName ?? incomingPayload?.callerInfo?.name ?? 'Người dùng';
  const displayAvatar = outgoing?.calleeAvatar ?? incomingPayload?.callerInfo?.avatar;

  const phaseLabel: Record<Phase, string> = {
    calling: 'Đang gọi...',
    incoming: `Cuộc gọi ${callType === 'video' ? 'video' : 'thoại'} đến`,
    connecting: 'Đang kết nối...',
    connected: formatDuration(duration),
    ended: 'Cuộc gọi kết thúc',
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-b from-gray-900 to-gray-800 text-white">

        {/* Remote video (background khi video call) */}
        {callType === 'video' && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        )}

        {/* Content layer */}
        <div className="relative z-10 flex flex-col items-center px-6 pt-12 pb-8 min-h-[420px]">

          {/* Avatar */}
          <div className="relative mb-4">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-4 border-white/20 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl font-bold shadow-xl border-4 border-white/20">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Ripple khi đang gọi */}
            {(phase === 'calling' || phase === 'incoming') && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />
                <div className="absolute -inset-3 rounded-full border border-white/15 animate-ping animation-delay-150" />
              </>
            )}
          </div>

          <h2 className="text-xl font-bold mb-1">{displayName}</h2>
          <p className="text-sm text-white/60 mb-2 flex items-center gap-1.5">
            {callType === 'video' ? <Video size={14} /> : <Phone size={14} />}
            {phaseLabel[phase]}
            {phase === 'connecting' && <Loader2 size={14} className="animate-spin ml-1" />}
          </p>

          {/* Local video (picture-in-picture) */}
          {callType === 'video' && phase === 'connected' && (
            <div className="absolute top-4 right-4 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg bg-black">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex-1" />

          {/* Controls */}
          <div className="w-full">
            {/* Incoming call */}
            {phase === 'incoming' && (
              <div className="flex items-center justify-center gap-12 mt-4">
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={handleReject}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all active:scale-95"
                  >
                    <PhoneMissed size={26} />
                  </button>
                  <span className="text-xs text-white/60">Từ chối</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={handleAccept}
                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg transition-all active:scale-95 animate-bounce"
                  >
                    <Phone size={26} />
                  </button>
                  <span className="text-xs text-white/60">Chấp nhận</span>
                </div>
              </div>
            )}

            {/* Calling (chờ callee pickup) */}
            {phase === 'calling' && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <button
                  onClick={handleEnd}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all active:scale-95"
                >
                  <PhoneOff size={26} />
                </button>
                <span className="text-xs text-white/60">Huỷ</span>
              </div>
            )}

            {/* Connecting */}
            {phase === 'connecting' && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <button
                  onClick={handleEnd}
                  className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
                >
                  <PhoneOff size={26} />
                </button>
                <span className="text-xs text-white/60">Huỷ</span>
              </div>
            )}

            {/* Connected */}
            {phase === 'connected' && (
              <div className="mt-6">
                {/* Secondary controls */}
                <div className="flex justify-center gap-4 mb-6">
                  <button
                    onClick={toggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/80' : 'bg-white/15 hover:bg-white/25'}`}
                    title={isMuted ? 'Bật micro' : 'Tắt micro'}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  <button
                    onClick={toggleSpeaker}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSpeakerOff ? 'bg-red-500/80' : 'bg-white/15 hover:bg-white/25'}`}
                    title={isSpeakerOff ? 'Bật loa' : 'Tắt loa'}
                  >
                    {isSpeakerOff ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  {callType === 'video' && (
                    <button
                      onClick={toggleCam}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCamOff ? 'bg-red-500/80' : 'bg-white/15 hover:bg-white/25'}`}
                      title={isCamOff ? 'Bật camera' : 'Tắt camera'}
                    >
                      {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                  )}
                </div>
                {/* End call */}
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={handleEnd}
                      className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all active:scale-95"
                    >
                      <PhoneOff size={26} />
                    </button>
                    <span className="text-xs text-white/60">Kết thúc</span>
                  </div>
                </div>
              </div>
            )}

            {/* Ended */}
            {phase === 'ended' && (
              <p className="text-center text-white/50 text-sm mt-4">Cuộc gọi kết thúc</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallModal;
