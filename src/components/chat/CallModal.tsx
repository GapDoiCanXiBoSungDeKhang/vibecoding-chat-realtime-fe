import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Phone, PhoneOff, PhoneMissed, Video, VideoOff,
  Mic, MicOff, Volume2, VolumeX, Loader2,
} from 'lucide-react';
import { useCallSocket } from '../../hooks/useCallSocket';
import type { CallType } from '../../hooks/useCallSocket';
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

// ─── WebRTC Manager ──────────────────────────────────────────────────────────
// Tách riêng ra ngoài component để tránh stale closure hoàn toàn
class RTCManager {
  private pc: RTCPeerConnection | null = null;
  private stream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteDescSet = false;
  private onTrackCb: ((s: MediaStream) => void) | null = null;

  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  async getStream(callType: CallType): Promise<MediaStream | null> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      return this.stream;
    } catch {
      return null;
    }
  }

  createPeer(
    onIce: (c: RTCIceCandidateInit) => void,
    onTrack: (stream: MediaStream) => void,
    onStateChange: (state: RTCPeerConnectionState) => void,
  ): RTCPeerConnection {
    this.pc = new RTCPeerConnection({ iceServers: this.iceServers });

    this.stream?.getTracks().forEach(t => this.pc!.addTrack(t, this.stream!));

    this.onTrackCb = onTrack;
    this.pc.ontrack = (e) => {
      if (e.streams?.[0]) {
        this.remoteStream = e.streams[0];
        this.onTrackCb?.(e.streams[0]);
      }
    };

    this.pc.onicecandidate = (e) => {
      if (e.candidate) onIce(e.candidate.toJSON());
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc) onStateChange(this.pc.connectionState);
    };

    return this.pc;
  }

  async setRemoteDesc(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    this.remoteDescSet = true;
    // Flush tất cả candidates đã buffer
    for (const c of this.pendingCandidates) {
      await this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    this.pendingCandidates = [];
  }

  async addCandidate(c: RTCIceCandidateInit): Promise<void> {
    if (!this.pc) return;
    if (!this.remoteDescSet) {
      // Buffer lại — remote desc chưa sẵn
      this.pendingCandidates.push(c);
      return;
    }
    await this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
  }

  async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.pc) return null;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit | null> {
    if (!this.pc) return null;
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  getLocalStream(): MediaStream | null { return this.stream; }
  getRemoteStream(): MediaStream | null { return this.remoteStream; }
  // Retry attach remote stream nếu ref chưa sẵn lúc onTrack chạy
  retryRemoteStream(): void {
    if (this.remoteStream && this.onTrackCb) {
      this.onTrackCb(this.remoteStream);
    }
  }

  toggleAudio(muted: boolean) {
    this.stream?.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }

  toggleVideo(off: boolean) {
    this.stream?.getVideoTracks().forEach(t => { t.enabled = !off; });
  }

  destroy() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.remoteStream = null;
    this.onTrackCb = null;
    this.pc?.close();
    this.pc = null;
    this.pendingCandidates = [];
    this.remoteDescSet = false;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
const CallModal: React.FC<CallModalProps> = ({ outgoing, incoming, onClose }) => {
  const [phase, setPhase] = useState<Phase>(outgoing ? 'calling' : 'incoming');
  const [callType] = useState<CallType>(outgoing?.callType ?? incoming?.callType ?? 'voice');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted]     = useState(false);
  const [isCamOff, setIsCamOff]   = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null); // audio riêng cho voice call
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dùng ref để giữ state không bị stale trong socket callbacks
  const rtc           = useRef(new RTCManager());
  const callIdRef     = useRef('');
  const remoteUserRef = useRef(outgoing?.calleId ?? incoming?.callerId ?? '');
  const phaseRef      = useRef<Phase>(outgoing ? 'calling' : 'incoming');

  const setPhaseSync = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  const startTimer = () => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  // Khi phase chuyển sang connected: attach stream vào elements
  // Audio tự play qua remoteVideoRef (autoPlay), video call cần set srcObject
  useEffect(() => {
    if (phase !== 'connected') return;
    // Small delay để đảm bảo video elements đã mount
    const t = setTimeout(() => {
      const rs = rtc.current.getRemoteStream();
      const ls = rtc.current.getLocalStream();
      if (rs) {
        // Video call: dùng video element
        if (callType === 'video' && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = rs;
        }
        // Voice call & video call: audio element riêng để đảm bảo audio play
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = rs;
          remoteAudioRef.current.play().catch(() => {});
        }
      }
      if (ls && callType === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = ls;
      }
    }, 150);
    return () => clearTimeout(t);
  }, [phase]);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    rtc.current.destroy();
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const formatDur = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // ─── Socket ─────────────────────────────────────────────────────────────
  const { initiateCall, acceptCall, rejectCall, endCall, cancelCall,
    sendOffer, sendAnswer, sendIceCandidate } = useCallSocket({

    onStarted: ({ callId: cid }) => {
      callIdRef.current = cid;
    },

    onIncoming: () => {}, // handled by ChatPage

    onAccepted: async ({ callId: cid }) => {
      if (phaseRef.current !== 'calling') return;
      callIdRef.current = cid;
      setPhaseSync('connecting');

      const stream = await rtc.current.getStream(callType);
      if (!stream) { toast.error('Không thể truy cập micro/camera'); return; }
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      rtc.current.createPeer(
        (c) => sendIceCandidate(cid, remoteUserRef.current, c),
        (s) => {
          // Dùng ref trực tiếp, nếu chưa mount thì rtc lưu lại để retry
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = s;
        },
        (state) => {
          if (state === 'connected') {
            setPhaseSync('connected');
            startTimer();
            // Retry attach stream sau khi video element render
            setTimeout(() => {
              rtc.current.retryRemoteStream();
            }, 100);
          }
          if (state === 'failed' || state === 'disconnected') {
            toast.error('Kết nối bị ngắt');
            cleanup(); setPhaseSync('ended'); setTimeout(onClose, 1500);
          }
        },
      );

      const ls = rtc.current.getLocalStream();
      if (ls && localVideoRef.current) localVideoRef.current.srcObject = ls;

      const offer = await rtc.current.createOffer();
      if (offer) sendOffer(cid, remoteUserRef.current, offer);
    },

    onRejected: ({ reasons }) => {
      toast(reasons ? `Bị từ chối: ${reasons}` : 'Cuộc gọi bị từ chối', { icon: '📵' });
      cleanup(); setPhaseSync('ended'); setTimeout(onClose, 1200);
    },

    onEnded: () => {
      cleanup(); setPhaseSync('ended'); setTimeout(onClose, 1200);
    },

    onCancelled: () => {
      toast('Cuộc gọi bị huỷ', { icon: '📵' });
      cleanup(); onClose();
    },

    onBusy: () => {
      toast.error('Người dùng đang bận');
      cleanup(); onClose();
    },

    onOffer: async ({ callId: cid, fromUserId, sdp }) => {
      if (phaseRef.current !== 'incoming' && phaseRef.current !== 'connecting') return;
      callIdRef.current = cid;
      remoteUserRef.current = fromUserId;
      setPhaseSync('connecting');

      const stream = await rtc.current.getStream(callType);
      if (!stream) { toast.error('Không thể truy cập micro/camera'); return; }
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      rtc.current.createPeer(
        (c) => sendIceCandidate(cid, fromUserId, c),
        (s) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = s;
        },
        (state) => {
          if (state === 'connected') {
            setPhaseSync('connected');
            startTimer();
            setTimeout(() => {
              rtc.current.retryRemoteStream();
            }, 100);
          }
          if (state === 'failed' || state === 'disconnected') {
            toast.error('Kết nối bị ngắt');
            cleanup(); setPhaseSync('ended'); setTimeout(onClose, 1500);
          }
        },
      );

      const ls2 = rtc.current.getLocalStream();
      if (ls2 && localVideoRef.current) localVideoRef.current.srcObject = ls2;

      await rtc.current.setRemoteDesc(sdp);
      const answer = await rtc.current.createAnswer();
      if (answer) sendAnswer(cid, fromUserId, answer);
    },

    onAnswer: async ({ sdp }) => {
      await rtc.current.setRemoteDesc(sdp);
      // connectionState change sẽ handle setPhase('connected')
    },

    onIceCandidate: async ({ candidate }) => {
      await rtc.current.addCandidate(candidate);
    },
  });

  // ─── Mount ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (outgoing) {
      initiateCall(outgoing.calleId, outgoing.conversationId, outgoing.callType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Actions ─────────────────────────────────────────────────────────────
  const handleAccept = () => {
    const cid = incoming?.callId ?? '';
    if (!cid) return;
    acceptCall(cid);
    callIdRef.current = cid;
    remoteUserRef.current = incoming?.callerId ?? '';
    setPhaseSync('connecting');
  };

  const handleReject = () => {
    const cid = callIdRef.current || incoming?.callId || '';
    if (cid) rejectCall(cid);
    cleanup(); onClose();
  };

  const handleEnd = () => {
    const cid = callIdRef.current;
    if (phaseRef.current === 'calling') { if (cid) cancelCall(cid); }
    else { if (cid) endCall(cid); }
    cleanup(); setPhaseSync('ended'); setTimeout(onClose, 800);
  };

  // ─── Toggles ─────────────────────────────────────────────────────────────
  const toggleMute = () => {
    rtc.current.toggleAudio(!isMuted);
    setIsMuted(m => !m);
  };
  const toggleCam = () => {
    rtc.current.toggleVideo(!isCamOff);
    setIsCamOff(c => !c);
  };
  const toggleSpeaker = () => {
    if (remoteVideoRef.current) remoteVideoRef.current.muted = !isSpeakerOff;
    setIsSpeakerOff(s => !s);
  };

  // ─── Display ─────────────────────────────────────────────────────────────
  const displayName   = outgoing?.calleeName ?? incoming?.callerName ?? 'Người dùng';
  const displayAvatar = outgoing?.calleeAvatar ?? incoming?.callerAvatar;

  const phaseLabel: Record<Phase, string> = {
    calling:    'Đang gọi...',
    incoming:   `Cuộc gọi ${callType === 'video' ? 'video' : 'thoại'} đến`,
    connecting: 'Đang kết nối...',
    connected:  formatDur(duration),
    ended:      'Cuộc gọi kết thúc',
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Hidden audio element — đảm bảo remote audio luôn play */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-b from-gray-900 to-gray-800 text-white">

        {callType === 'video' && phase === 'connected' && (
          <video ref={remoteVideoRef} autoPlay playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-80" />
        )}

        <div className="relative z-10 flex flex-col items-center px-6 pt-12 pb-8 min-h-[420px]">

          {/* Avatar + ripple */}
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

          {callType === 'video' && phase === 'connected' && (
            <div className="absolute top-4 right-4 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg bg-black">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex-1" />

          {/* Controls */}
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