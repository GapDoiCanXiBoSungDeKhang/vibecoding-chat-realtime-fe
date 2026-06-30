import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX, Users } from 'lucide-react';
import { useGroupCallSocket } from '../../hooks/useGroupCallSocket';
import type { CallType } from '../../hooks/useCallSocket';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';

// ─── RTCManager cho mesh group call ──────────────────────────────────────────
class PeerConnection {
  pc: RTCPeerConnection;
  private remoteDescSet = false;
  private pending: RTCIceCandidateInit[] = [];

  constructor(
    localStream: MediaStream,
    onIce: (c: RTCIceCandidateInit) => void,
    onTrack: (s: MediaStream) => void,
    onState: (s: RTCPeerConnectionState) => void,
  ) {
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    localStream.getTracks().forEach(t => this.pc.addTrack(t, localStream));
    this.pc.onicecandidate = e => { if (e.candidate) onIce(e.candidate.toJSON()); };
    this.pc.ontrack = e => { if (e.streams?.[0]) onTrack(e.streams[0]); };
    this.pc.onconnectionstatechange = () => onState(this.pc.connectionState);
  }

  async setRemote(sdp: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    this.remoteDescSet = true;
    for (const c of this.pending) {
      await this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    this.pending = [];
  }

  async addCandidate(c: RTCIceCandidateInit) {
    if (!this.remoteDescSet) { this.pending.push(c); return; }
    await this.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
  }

  async createOffer() {
    const o = await this.pc.createOffer();
    await this.pc.setLocalDescription(o);
    return o;
  }

  async createAnswer() {
    const a = await this.pc.createAnswer();
    await this.pc.setLocalDescription(a);
    return a;
  }

  close() { this.pc.close(); }
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface GroupCallModalProps {
  conversationId: string;
  conversationName: string;
  currentUserId: string;
  currentUserName: string;
  // Nếu incoming: thông tin từ socket
  incoming?: { callId: string; hostId: string; callType: CallType };
  // Nếu outgoing: host tự start
  outgoing?: { callType: CallType };
  onClose: () => void;
}

interface ParticipantState {
  userId: string;
  name: string;
  avatar?: string;
  stream?: MediaStream;
  connected: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
const GroupCallModal: React.FC<GroupCallModalProps> = ({
  conversationId,
  conversationName,
  currentUserId,
  currentUserName,
  incoming,
  outgoing,
  onClose,
}) => {
  const [callId, setCallId]             = useState(incoming?.callId ?? '');
  const [callType]                      = useState<CallType>(incoming?.callType ?? outgoing?.callType ?? 'voice');
  const [phase, setPhase]               = useState<'waiting' | 'active' | 'ended'>(incoming ? 'waiting' : 'active');
  const [participants, setParticipants] = useState<ParticipantState[]>([]);
  const [isMuted, setIsMuted]           = useState(false);
  const [isCamOff, setIsCamOff]         = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [duration, setDuration]         = useState(0);

  const callIdRef       = useRef(incoming?.callId ?? '');
  const localStreamRef  = useRef<MediaStream | null>(null);
  const peersRef        = useRef<Map<string, PeerConnection>>(new Map());
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRefs       = useRef<Map<string, HTMLAudioElement>>(new Map());

  const setCallIdSync = (id: string) => { callIdRef.current = id; setCallId(id); };

  const formatDur = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // ─── Local stream ──────────────────────────────────────────────────────────
  const getLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      localStreamRef.current = stream;
      return stream;
    } catch {
      toast.error('Không thể truy cập micro/camera');
      return null;
    }
  }, [callType]);

  // ─── Tạo peer connection với 1 user ───────────────────────────────────────
  const createPeer = useCallback((targetUserId: string) => {
    if (!localStreamRef.current) return null;
    if (peersRef.current.has(targetUserId)) return peersRef.current.get(targetUserId)!;

    const peer = new PeerConnection(
      localStreamRef.current,
      (c) => sendIceCandidate(callIdRef.current, targetUserId, c),
      (stream) => {
        // Attach remote stream
        setParticipants(prev => prev.map(p =>
          p.userId === targetUserId ? { ...p, stream, connected: true } : p
        ));
        // Audio element
        let audio = audioRefs.current.get(targetUserId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audioRefs.current.set(targetUserId, audio);
        }
        audio.srcObject = stream;
        if (!isSpeakerOff) audio.play().catch(() => {});
      },
      (state) => {
        if (state === 'connected') {
          setParticipants(prev => prev.map(p =>
            p.userId === targetUserId ? { ...p, connected: true } : p
          ));
        }
        if (state === 'failed') {
          toast.error(`Mất kết nối với một thành viên`);
        }
      },
    );

    peersRef.current.set(targetUserId, peer);
    return peer;
  }, [isSpeakerOff]);

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    peersRef.current.forEach(p => p.close());
    peersRef.current.clear();
    audioRefs.current.forEach(a => { a.pause(); a.srcObject = null; });
    audioRefs.current.clear();
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // ─── Socket ────────────────────────────────────────────────────────────────
  const { startGroupCall, joinGroupCall, leaveGroupCall, endGroupCall,
    sendOffer, sendAnswer, sendIceCandidate } = useGroupCallSocket({

    onStarted: async ({ callId: cid, hostId }) => {
      // Người khác trong conversation nhận được group_call_started
      if (hostId === currentUserId) return; // host đã xử lý rồi
      setCallIdSync(cid);
      setPhase('waiting');
    },

    onJoined: async ({ callId: cid, userId, userInfo }) => {
      if (userId === currentUserId) return;
      // Thêm participant mới
      setParticipants(prev => {
        if (prev.find(p => p.userId === userId)) return prev;
        return [...prev, { userId, name: userInfo.name, avatar: userInfo.avatar, connected: false }];
      });
      // Nếu đang active → tạo offer đến user mới
      if (phase === 'active' && localStreamRef.current) {
        const peer = createPeer(userId);
        if (peer) {
          const offer = await peer.createOffer();
          sendOffer(cid, userId, offer);
        }
      }
    },

    onLeft: ({ userId }) => {
      setParticipants(prev => prev.filter(p => p.userId !== userId));
      peersRef.current.get(userId)?.close();
      peersRef.current.delete(userId);
      audioRefs.current.get(userId)?.pause();
      audioRefs.current.delete(userId);
    },

    onEnded: () => {
      toast('Cuộc gọi nhóm đã kết thúc', { icon: '📵' });
      cleanup();
      setPhase('ended');
      setTimeout(onClose, 1200);
    },

    onOffer: async ({ callId: cid, fromUserId, sdp }) => {
      if (!localStreamRef.current) return;
      setParticipants(prev => {
        if (prev.find(p => p.userId === fromUserId)) return prev;
        return [...prev, { userId: fromUserId, name: '...', connected: false }];
      });
      const peer = createPeer(fromUserId);
      if (!peer) return;
      await peer.setRemote(sdp);
      const answer = await peer.createAnswer();
      sendAnswer(cid, fromUserId, answer);
    },

    onAnswer: async ({ fromUserId, sdp }) => {
      const peer = peersRef.current.get(fromUserId);
      if (peer) await peer.setRemote(sdp);
    },

    onIceCandidate: async ({ fromUserId, candidate }) => {
      const peer = peersRef.current.get(fromUserId);
      if (peer) await peer.addCandidate(candidate);
    },
  });

  // ─── Mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const stream = await getLocalStream();
      if (!stream) { onClose(); return; }

      if (outgoing) {
        // Host: start group call
        startGroupCall(conversationId, callType);
        setPhase('active');
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      }
      // incoming: chờ user bấm "Tham gia"
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!callId) return;
    joinGroupCall(callId);
    setPhase('active');
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  };

  const handleLeave = () => {
    if (callId) leaveGroupCall(callId);
    cleanup();
    onClose();
  };

  const handleEnd = () => {
    // Chỉ host (người start) mới được end toàn bộ
    if (callId) endGroupCall(callId);
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(m => !m);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = isCamOff; });
    setIsCamOff(c => !c);
  };

  const toggleSpeaker = () => {
    audioRefs.current.forEach(a => { a.muted = !isSpeakerOff; });
    setIsSpeakerOff(s => !s);
  };

  // ─── Video grid ─────────────────────────────────────────────────────────────
  const VideoTile = ({ participant }: { participant: ParticipantState }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
      if (videoRef.current && participant.stream) {
        videoRef.current.srcObject = participant.stream;
      }
    }, [participant.stream]);

    return (
      <div className="relative rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center aspect-video">
        {callType === 'video' && participant.stream ? (
          <video ref={videoRef} autoPlay playsInline muted={false}
            className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Avatar name={participant.name} size="lg" />
            <span className="text-white text-xs font-medium">{participant.name}</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/50 rounded px-1.5 py-0.5 text-white text-[10px] font-medium">
          {participant.name}
          {!participant.connected && <span className="ml-1 opacity-60">đang kết nối...</span>}
        </div>
      </div>
    );
  };

  // ─── Local video tile ────────────────────────────────────────────────────
  const LocalVideoTile = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
      if (videoRef.current && localStreamRef.current) {
        videoRef.current.srcObject = localStreamRef.current;
      }
    }, []);

    return (
      <div className="relative rounded-xl overflow-hidden bg-gray-700 flex items-center justify-center aspect-video">
        {callType === 'video' ? (
          <video ref={videoRef} autoPlay playsInline muted
            className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Avatar name={currentUserName} size="lg" />
            <span className="text-white text-xs font-medium">{currentUserName} (Bạn)</span>
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/50 rounded px-1.5 py-0.5 text-white text-[10px] font-medium">
          Bạn {isMuted && <span className="text-red-400 ml-1">🔇</span>}
        </div>
      </div>
    );
  };

  const totalCount = participants.length + 1; // +1 là bản thân
  const gridCols = totalCount <= 1 ? 'grid-cols-1' : totalCount <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden shadow-2xl bg-gray-900 text-white flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="font-bold text-base">{conversationName}</h2>
            <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
              <Users size={12} />
              {totalCount} người tham gia
              {phase === 'active' && (
                <span className="ml-2 text-green-400 font-mono">{formatDur(duration)}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {callType === 'video' && (
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold">VIDEO</span>
            )}
            <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
              {phase === 'waiting' ? 'Đang chờ' : phase === 'active' ? 'Đang gọi' : 'Kết thúc'}
            </span>
          </div>
        </div>

        {/* Video grid */}
        <div className={`flex-1 overflow-y-auto p-4 grid ${gridCols} gap-3`}>
          <LocalVideoTile />
          {participants.map(p => <VideoTile key={p.userId} participant={p} />)}
        </div>

        {/* Controls */}
        <div className="px-5 py-4 border-t border-white/10">
          {phase === 'waiting' ? (
            /* Incoming: chờ join */
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <button onClick={handleLeave}
                  className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-95 shadow-lg">
                  <PhoneOff size={22} />
                </button>
                <span className="text-xs text-white/50">Bỏ qua</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <button onClick={handleJoin}
                  className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-all active:scale-95 shadow-lg animate-pulse">
                  <Users size={22} />
                </button>
                <span className="text-xs text-white/50">Tham gia</span>
              </div>
            </div>
          ) : (
            /* Active: controls */
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <button onClick={toggleMute}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/80' : 'bg-white/15 hover:bg-white/25'}`}>
                  {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <button onClick={toggleSpeaker}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isSpeakerOff ? 'bg-red-500/80' : 'bg-white/15 hover:bg-white/25'}`}>
                  {isSpeakerOff ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                {callType === 'video' && (
                  <button onClick={toggleCam}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${isCamOff ? 'bg-red-500/80' : 'bg-white/15 hover:bg-white/25'}`}>
                    {isCamOff ? <VideoOff size={18} /> : <Video size={18} />}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center gap-1">
                  <button onClick={handleLeave}
                    className="w-11 h-11 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-all active:scale-95">
                    <PhoneOff size={18} />
                  </button>
                  <span className="text-[10px] text-white/40">Rời</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <button onClick={handleEnd}
                    className="w-11 h-11 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all active:scale-95">
                    <PhoneOff size={18} />
                  </button>
                  <span className="text-[10px] text-white/40">Kết thúc</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCallModal;
