import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Phone, Video, MoreVertical, Loader2, Image, File as FileIcon, Mic, MicOff, Smile, Reply, Edit2, Trash2, Forward, Pin, PinOff, X, Check, Info, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { messageService } from '../../services/messageService';
import { conversationService } from '../../services/conversationService';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';
import { useMessageSocket } from '../../hooks/useMessageSocket';

interface ChatAreaProps { activeChat: string | null; onClose?: () => void; onOpenInfo?: () => void; }

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const formatTime = (d: string) => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};


const ChatArea: React.FC<ChatAreaProps> = ({ activeChat, onClose, onOpenInfo }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [conversationInfo, setConversationInfo] = useState<any>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [editingMsg, setEditingMsg] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: any } | null>(null);
  const [emojiPickerMsg, setEmojiPickerMsg] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [forwardMsg, setForwardMsg] = useState<any>(null);
  const [forwardTargets, setForwardTargets] = useState<string[]>([]);

  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<number | null>(null);
  const [imageViewer, setImageViewer] = useState<{ images: any[], startIndex: number } | null>(null);
  const [filesQueue, setFilesQueue] = useState<{ file: File, type: 'file' | 'media' }[]>([]);


  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleNewMessage = useCallback((payload: any) => {
    let msg = payload.message || payload;
    if (payload.attachments && (!msg.attachments || msg.attachments.length === 0)) {
      msg = { ...msg, attachments: payload.attachments };
    }
    setMessages(prev => [...prev, msg]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const { isTyping, notifyTyping, stopTyping } = useMessageSocket({
    activeChat,
    currentUserId: user?.sub,
    onNewMessage: handleNewMessage,
    onConversationUpdate: () => fetchChatData(),
    onMessageEdited: (payload: any) => {
      const edited = payload.message || payload;
      setMessages(prev => prev.map(m => (m._id === (edited._id || edited.id)) ? { ...m, ...edited, isEdited: true } : m));
    },
    onMessageDeleted: (payload: any) => {
      if (payload.scope === 'everyone') {
        setMessages(prev => prev.map(m => m._id === payload.messageId ? { ...m, isDeleted: true, content: 'Tin nhắn đã bị thu hồi' } : m));
      } else if (payload.deletedBy === user?.sub) {
        setMessages(prev => prev.filter(m => m._id !== payload.messageId));
      }
    },
    onMessageReacted: (payload: any) => {
      setMessages(prev => prev.map(m => {
        if (m._id !== payload.messageId) return m;
        let reactions = [...(m.reactions || [])];
        if (payload.action === 'remove') {
          reactions = reactions.filter((r: any) => (r.userId?._id || r.userId) !== payload.userId);
        } else {
          reactions = reactions.filter((r: any) => (r.userId?._id || r.userId) !== payload.userId);
          reactions.push({ userId: payload.userId, emoji: payload.emoji });
        }
        return { ...m, reactions };
      }));
    },
    onMessageSeen: (payload: any) => {
      setMessages(prev => prev.map(m => {
        if (!m.seenBy) return m;
        const already = m.seenBy.some((s: any) => (s._id || s) === (payload.seenBy?._id || payload.userId));
        if (already) return m;
        return { ...m, seenBy: [...m.seenBy, payload.seenBy || { _id: payload.userId }] };
      }));
    },
    onMessagePinned: (payload: any) => {
      setMessages(prev => prev.map(m => m._id === payload.messageId ? { ...m, isPinned: true } : m));
    },
    onMessageUnpinned: (payload: any) => {
      setMessages(prev => prev.map(m => m._id === payload.messageId ? { ...m, isPinned: false } : m));
    },
  });

  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (activeChat) { fetchChatData(); setIsDropdownOpen(false); setReplyTo(null); setEditingMsg(null); }
  }, [activeChat]);

  useEffect(() => {
    if (isTyping) scrollToBottom('smooth');
  }, [isTyping, scrollToBottom]);

  // Mark as seen when opening chat
  useEffect(() => {
    if (activeChat) messageService.markAsSeen(activeChat).catch(() => {});
  }, [activeChat]);

  const fetchChatData = async () => {
    setIsLoading(true);
    try {
      const [info, data] = await Promise.all([
        conversationService.getConversationInfo(activeChat!),
        messageService.getMessages(activeChat!, 30),
      ]);
      setConversationInfo(info);
      const msgs = data.messages || data;
      setMessages(msgs);
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);
      setTimeout(() => scrollToBottom('auto'), 50);
    } catch { toast.error('Không thể tải cuộc trò chuyện'); }
    finally { setIsLoading(false); }
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await messageService.getMessages(activeChat!, 30, nextCursor);
      setMessages(prev => [...(data.messages || []), ...prev]);
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);
    } catch {} finally { setLoadingMore(false); }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = editingMsg ? editContent : newMessage;
    
    if (filesQueue.length > 0) {
      await handleUploadQueue();
      return;
    }

    if (!text.trim() || !activeChat) return;
    stopTyping();

    if (editingMsg) {
      try {
        await messageService.editMessage(activeChat, editingMsg._id, editContent);
        setMessages(prev => prev.map(m => m._id === editingMsg._id ? { ...m, content: editContent, isEdited: true } : m));
        setEditingMsg(null); setEditContent('');
      } catch { toast.error('Không thể sửa'); }
      return;
    }

    setIsSending(true);
    try {
      await messageService.sendMessage(activeChat, text, replyTo?._id);
      setNewMessage(''); setReplyTo(null);
    } catch { toast.error('Không thể gửi'); }
    finally { setIsSending(false); }
  };

  const handleUploadQueue = async () => {
    if (!filesQueue.length || !activeChat) return;
    setIsSending(true);
    try {
      const mediaFiles = filesQueue.filter(f => f.type === 'media').map(f => f.file);
      const regularFiles = filesQueue.filter(f => f.type === 'file').map(f => f.file);

      if (mediaFiles.length) await messageService.uploadMedia(activeChat, mediaFiles, replyTo?._id);
      if (regularFiles.length) await messageService.uploadFiles(activeChat, regularFiles, replyTo?._id);
      
      setFilesQueue([]);
      setReplyTo(null);
      setNewMessage('');
      toast.success('Đã gửi tệp');
    } catch {
      toast.error('Không thể tải lên một số tệp');
    } finally {
      setIsSending(false);
    }
  };


  const handleDelete = async (msg: any, scope: 'everyone' | 'self') => {
    try {
      await messageService.deleteMessage(activeChat!, msg._id, scope);
      if (scope === 'everyone') {
        setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isDeleted: true, content: 'Tin nhắn đã bị thu hồi' } : m));
      } else {
        setMessages(prev => prev.filter(m => m._id !== msg._id));
      }
    } catch { toast.error('Không thể xóa'); }
    setContextMenu(null);
  };

  const handleReact = async (msgId: string, emoji: string) => {
    try {
      await messageService.reactMessage(activeChat!, msgId, emoji);
      setMessages(prev => prev.map(m => {
        if (m._id !== msgId) return m;
        const reactions = (m.reactions || []).filter((r: any) => r.userId !== user?.sub);
        return { ...m, reactions: [...reactions, { userId: user?.sub, emoji }] };
      }));
    } catch { toast.error('Không thể thả cảm xúc'); }
    setEmojiPickerMsg(null);
  };

  const handlePin = async (msg: any) => {
    try {
      await messageService.pinMessage(activeChat!, msg._id);
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isPinned: true } : m));
      toast.success('Đã ghim tin nhắn');
    } catch { toast.error('Không thể ghim'); }
    setContextMenu(null);
  };

  const handleUnpin = async (msg: any) => {
    try {
      await messageService.unpinMessage(activeChat!, msg._id);
      setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, isPinned: false } : m));
      toast.success('Đã bỏ ghim');
    } catch { toast.error('Không thể bỏ ghim'); }
    setContextMenu(null);
  };

  const handleUnreact = async (msgId: string) => {
    try {
      await messageService.unreactMessage(activeChat!, msgId);
      setMessages(prev => prev.map(m => {
        if (m._id !== msgId) return m;
        return { ...m, reactions: (m.reactions || []).filter((r: any) => (r.userId?._id || r.userId) !== user?.sub) };
      }));
    } catch { toast.error('Không thể bỏ cảm xúc'); }
  };

  const handleForward = async () => {
    if (!forwardMsg || !forwardTargets.length || !activeChat) return;
    try {
      await messageService.forwardMessage(activeChat, forwardMsg._id, forwardTargets);
      toast.success(`Đã chuyển tiếp đến ${forwardTargets.length} cuộc trò chuyện`);
    } catch { toast.error('Không thể chuyển tiếp'); }
    setForwardMsg(null); setForwardTargets([]);
  };

  const openForwardModal = async (msg: any) => {
    setForwardMsg(msg);
    setContextMenu(null);
    try {
      const { conversationService } = await import('../../services/conversationService');
      const convs = await conversationService.getConversations();
      setAllConversations(convs.filter((c: any) => c._id !== activeChat));
    } catch {}
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        try {
          await messageService.uploadVoice(activeChat!, file, replyTo?._id);
          setReplyTo(null);
        } catch { toast.error('Gửi voice thất bại'); }
        setIsRecording(false);
        setRecordingDuration(0);
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      
      setRecordingDuration(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch { toast.error('Không thể truy cập micro'); }
  };

  const stopVoiceRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'media') => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const totalInQueue = filesQueue.length + files.length;
    if (totalInQueue > 10) {
      toast.error('Chỉ được phép tải lên tối đa 10 tệp cùng lúc');
      e.target.value = '';
      return;
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const oversized = files.find(f => f.size > MAX_SIZE);
    if (oversized) {
      toast.error('Kích thước mỗi tệp tối đa là 10MB');
      e.target.value = '';
      return;
    }

    if (type === 'media') {
      const invalid = files.find(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
      if (invalid) {
        toast.error('Chỉ hỗ trợ tệp hình ảnh hoặc video');
        e.target.value = '';
        return;
      }
    }

    const newQueueItems = files.map(file => ({ file, type }));
    setFilesQueue(prev => [...prev, ...newQueueItems]);
    e.target.value = '';
  };


  const isPrivate = conversationInfo?.type === 'private';
  const headerOther = isPrivate ? conversationInfo?.participants?.find((p: any) => p.userId?._id !== user?.sub)?.userId : null;
  const headerName = isPrivate ? (headerOther?.name || 'Người dùng') : (conversationInfo?.name || '');
  const memberCount = conversationInfo?.participants?.length || 0;
  const currentUserRole = conversationInfo?.participants?.find((p: any) => p.userId?._id === user?.sub)?.role;

  if (!activeChat) return (
    <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Chào mừng đến Zalo Hybrid</h2>
      <p className="text-gray-400 text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full relative" onClick={() => { setIsDropdownOpen(false); setContextMenu(null); setEmojiPickerMsg(null); }}>
      {/* Header */}
      <header className="h-16 px-5 bg-white border-b border-gray-100 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Avatar name={headerName || '?'} size="md" />
          <div>
            <div className="font-bold text-gray-900 text-[15px]">{headerName || '…'}</div>
            <div className="text-[11px] text-gray-400">{isPrivate ? (headerOther?.isOnline ? <span className="text-green-500">Đang hoạt động</span> : 'Ngoại tuyến') : `${memberCount} thành viên`}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Gọi thoại"><Phone size={18} /></button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Gọi video"><Video size={18} /></button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button onClick={onOpenInfo} className="p-2 text-gray-500 hover:bg-blue-100 hover:text-blue-600 rounded-full transition-colors" title="Thông tin"><Info size={18} /></button>
          <div className="relative">
            <button onClick={e => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><MoreVertical size={18} /></button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
                {conversationInfo?.type === 'group' && (<>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Thêm thành viên</button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Quản lý thành viên</button>
                  <div className="h-px bg-gray-100 my-1" />
                  <button onClick={async () => { await conversationService.leaveGroup(user!.sub, user!.name, activeChat!); onClose?.(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Rời nhóm</button>
                  {currentUserRole === 'owner' && <button onClick={async () => { await conversationService.disbandGroup(user!.sub, activeChat!); onClose?.(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-bold">Giải tán nhóm</button>}
                </>)}
                {isPrivate && <button onClick={async () => { await conversationService.removeConversation(activeChat!); onClose?.(); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Xóa trò chuyện</button>}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center py-2 bg-white/80">
          <button onClick={loadMore} disabled={loadingMore} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
            {loadingMore ? <Loader2 size={12} className="animate-spin" /> : null} Tải thêm tin nhắn cũ
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-[#f0f4ff]/30">
        {isLoading ? (
          <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
        ) : messages.map((msg, i) => {
          const isMine = (msg.senderId?._id || msg.senderId) === user?.sub;
          const prev = messages[i - 1];
          const sameAuthor = prev && (prev.senderId?._id || prev.senderId) === (msg.senderId?._id || msg.senderId);
          const isSystem = msg.type === 'system';

          if (isSystem) return (
            <div key={msg._id || i} className="flex justify-center py-1">
              <span className="text-[11px] text-gray-400 bg-gray-100/80 px-3 py-1 rounded-full">{msg.content}</span>
            </div>
          );

          const reactions = msg.reactions || [];
          const grouped = reactions.reduce((acc: any, r: any) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {});

          return (
            <div key={msg._id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
              <div className={`flex gap-2 max-w-[72%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMine && (
                  <div className="self-end flex-shrink-0 w-7">
                    {!sameAuthor ? <Avatar name={msg.senderId?.name || 'U'} size="sm" /> : null}
                  </div>
                )}
                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  {!isMine && !isPrivate && !sameAuthor && (
                    <span className="text-[10px] text-gray-500 ml-1 mb-0.5 font-medium">{msg.senderId?.name}</span>
                  )}
                  {/* Reply preview */}
                  {msg.replyTo && (
                    <div className={`mb-1 px-3 py-1.5 rounded-lg border-l-2 border-blue-400 bg-blue-50/80 text-xs text-gray-500 max-w-xs`}>
                      <div className="font-medium text-blue-600">{msg.replyTo.senderId?.name}</div>
                      <div className="truncate">{msg.replyTo.content}</div>
                    </div>
                  )}
                  {/* Bubble */}
                  <div
                    className={`relative px-3 py-2 rounded-2xl text-sm shadow-sm ${msg.isDeleted ? 'italic text-gray-400 bg-gray-100' : isMine ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'}`}
                    onContextMenu={e => { e.preventDefault(); if (!msg.isDeleted) setContextMenu({ x: e.clientX, y: e.clientY, msg }); }}
                  >
                    {msg.type === 'file' && !msg.isDeleted ? (
                      <div className="flex flex-col gap-2">
                        {msg.attachments?.map((a: any, ai: number) => (
                          <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer" 
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 group/file">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover/file:bg-blue-600 group-hover/file:text-white transition-colors">
                              <FileIcon size={20} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium text-gray-800 truncate pr-2">
                                {a.filename || a.originalName || 'Tệp đính kèm'}
                              </span>
                              <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                                {a.filename?.split('.').pop() || 'FILE'} • {formatFileSize(a.size || 0)}
                              </span>
                            </div>
                            <div className="ml-auto opacity-0 group-hover/file:opacity-100 transition-opacity">
                              <ExternalLink size={14} className="text-gray-400" />
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : msg.type === 'media' && !msg.isDeleted ? (
                      <div className="grid grid-cols-2 gap-1.5 max-w-[320px]">
                        {msg.attachments?.map((a: any, ai: number) => {
                          const isSingle = msg.attachments.length === 1;
                          return (
                            <div key={ai} className={`relative group/media overflow-hidden rounded-xl border border-gray-100 bg-gray-50 ${isSingle ? 'col-span-2' : 'col-span-1'}`}>
                              <img src={a.url} alt="media" 
                                className="w-full h-full max-h-64 object-cover cursor-pointer hover:scale-105 transition-transform duration-300" 
                                onClick={() => setImageViewer({ images: msg.attachments, startIndex: ai })}
                              />
                              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-black/40 translate-y-full group-hover/media:translate-y-0 transition-transform flex justify-between items-center">
                                <span className="text-[9px] text-white font-medium truncate pr-2">{a.filename || a.originalName || 'Image'}</span>
                                <span className="text-[9px] text-white/80 flex-shrink-0">{formatFileSize(a.size || 0)}</span>
                              </div>
                            </div>
                          );
                        })}
                        {msg.content && <p className="col-span-2 text-xs mt-1 opacity-80">{msg.content}</p>}
                      </div>
                    ) : msg.type === 'voice' && !msg.isDeleted ? (
                      <div className="flex flex-col gap-1.5 p-1 bg-white/10 rounded-xl min-w-[200px]">
                        <div className="flex items-center gap-3 px-2 py-1">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                            <Mic size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Tin nhắn thoại</span>
                            <span className="text-[9px] opacity-70">{msg.attachments?.[0]?.duration ? `${Math.round(msg.attachments[0].duration)} giây` : 'Đã ghi âm'}</span>
                          </div>
                        </div>
                        <audio src={msg.attachments?.[0]?.url} controls preload="metadata" className="h-8 w-full invert opacity-90">
                           <source src={msg.attachments?.[0]?.url} type="audio/webm" />
                        </audio>
                      </div>

                    ) : msg.type === 'call' && !msg.isDeleted ? (
                      <div className="flex items-center gap-2">
                        <Phone size={13} className={isMine ? 'text-white/70' : 'text-gray-400'} />
                        <span>{msg.content}</span>
                        {msg.callInfo?.duration && <span className="text-xs opacity-70">{Math.round(msg.callInfo.duration / 60)}:{String(msg.callInfo.duration % 60).padStart(2, '0')}</span>}
                      </div>
                    ) : (
                      <span className="break-words">{msg.content}</span>
                    )}
                    {msg.isEdited && !msg.isDeleted && <span className="text-[9px] ml-1 opacity-60">(đã sửa)</span>}
                    {msg.isPinned && <span className="ml-1 text-[9px] opacity-60">📌</span>}

                    {/* Hover action bar */}
                    {!msg.isDeleted && (
                      <div className={`absolute -top-7 ${isMine ? 'right-0' : 'left-0'} hidden group-hover:flex bg-white rounded-full shadow-md border border-gray-100 px-1 py-0.5 gap-0.5 z-20`}>
                        <button onClick={(e) => { e.stopPropagation(); setEmojiPickerMsg(msg._id); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-500" title="Cảm xúc"><Smile size={13} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setReplyTo(msg); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-500" title="Trả lời"><Reply size={13} /></button>
                        <button onClick={(e) => { e.stopPropagation(); openForwardModal(msg); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-500" title="Chuyển tiếp"><Forward size={13} /></button>
                        {isMine && <button onClick={(e) => { e.stopPropagation(); setEditingMsg(msg); setEditContent(msg.content); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-500" title="Sửa"><Edit2 size={13} /></button>}
                        <button onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, msg }); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-500" title="Thêm"><MoreVertical size={13} /></button>
                      </div>
                    )}

                    {/* Emoji picker */}
                    {emojiPickerMsg === msg._id && (
                      <div className={`absolute z-40 ${isMine ? 'right-0' : 'left-0'} bottom-full mb-1 bg-white rounded-full shadow-xl border border-gray-100 px-2 py-1 flex gap-1`} onClick={e => e.stopPropagation()}>
                        {EMOJIS.map(em => <button key={em} onClick={() => handleReact(msg._id, em)} className="text-lg hover:scale-125 transition-transform">{em}</button>)}
                      </div>
                    )}
                  </div>

                  {/* Reactions */}
                  {Object.keys(grouped).length > 0 && (
                    <div className={`flex flex-wrap gap-0.5 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {Object.entries(grouped).map(([em, cnt]) => {
                        const myReaction = (msg.reactions || []).find((r: any) => (r.userId?._id || r.userId) === user?.sub && r.emoji === em);
                        return (
                          <button key={em} onClick={() => myReaction ? handleUnreact(msg._id) : handleReact(msg._id, em)}
                            className={`text-xs border rounded-full px-1.5 py-0.5 shadow-sm transition-colors ${myReaction ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                            {em} {String(cnt)}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Time + seen */}
                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                    {isMine && msg.seenBy && msg.seenBy.length > 0 && (
                      <div className="flex -space-x-1">
                        {msg.seenBy.filter((s: any) => s._id !== user?.sub).slice(0, 3).map((s: any, i: number) => (
                          <img key={i} src={s.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(s.name || 'U')} alt={s.name} title={`Đã xem bởi ${s.name}`} className="w-3.5 h-3.5 rounded-full border border-white" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex gap-1 items-center rounded-bl-sm">
              {[0, 0.15, 0.3].map((d, i) => <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />)}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context menu */}
      {contextMenu && contextMenu.x > 0 && (
        <div className="fixed bg-white border border-gray-100 shadow-xl rounded-xl py-1.5 w-48 z-50 animate-in fade-in zoom-in-95"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 250), left: Math.min(contextMenu.x, window.innerWidth - 200) }} onClick={e => e.stopPropagation()}>
          <button onClick={() => { setReplyTo(contextMenu.msg); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"><Reply size={14} /> Trả lời</button>
          <button onClick={() => { openForwardModal(contextMenu.msg); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"><Forward size={14} /> Chuyển tiếp</button>
          {(contextMenu.msg.senderId?._id || contextMenu.msg.senderId) === user?.sub && (
            <button onClick={() => { setEditingMsg(contextMenu.msg); setEditContent(contextMenu.msg.content); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"><Edit2 size={14} /> Chỉnh sửa</button>
          )}
          {contextMenu.msg.isPinned ? (
            <button onClick={() => handleUnpin(contextMenu.msg)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"><PinOff size={14} /> Bỏ ghim</button>
          ) : (
            <button onClick={() => handlePin(contextMenu.msg)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"><Pin size={14} /> Ghim</button>
          )}
          <div className="h-px bg-gray-100 my-1" />
          {(contextMenu.msg.senderId?._id || contextMenu.msg.senderId) === user?.sub && (
            <button onClick={() => handleDelete(contextMenu.msg, 'everyone')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Thu hồi</button>
          )}
          <button onClick={() => handleDelete(contextMenu.msg, 'self')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><X size={14} /> Xóa phía tôi</button>
        </div>
      )}

      {/* Reply/Edit/Files Queue banner */}
      {(replyTo || editingMsg || filesQueue.length > 0) && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {replyTo || editingMsg ? (
              <div className="text-xs text-blue-700">
                <span className="font-bold">{editingMsg ? '✏️ Chỉnh sửa' : `↩ Trả lời ${replyTo?.senderId?.name}`}</span>
                <div className="truncate text-gray-500 max-w-sm">{editingMsg ? editContent : replyTo?.content}</div>
              </div>
            ) : null}
            
            {filesQueue.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {filesQueue.map((item, idx) => (
                  <div key={idx} className="relative flex-shrink-0 group/q">
                    <div className="w-12 h-12 rounded-lg bg-white border border-blue-200 flex items-center justify-center overflow-hidden shadow-sm">
                      {item.type === 'media' && item.file.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(item.file)} className="w-full h-full object-cover" alt="preview" />
                      ) : (
                        <FileIcon size={20} className="text-blue-500" />
                      )}
                    </div>
                    <button onClick={() => setFilesQueue(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover/q:opacity-100 transition-opacity">
                      <X size={10} />
                    </button>
                    <span className="absolute -bottom-1 left-0 right-0 text-[8px] bg-black/50 text-white text-center truncate px-0.5 rounded-b-lg">
                      {formatFileSize(item.file.size)}
                    </span>
                  </div>
                ))}
                <span className="text-[10px] text-blue-600 font-bold ml-2 whitespace-nowrap">{filesQueue.length} tệp đã chọn</span>
              </div>
            )}
          </div>
          <button onClick={() => { setReplyTo(null); setEditingMsg(null); setEditContent(''); setFilesQueue([]); }} className="text-gray-400 hover:text-gray-600 ml-4"><X size={16} /></button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFileUpload(e, 'file')} />
        <input ref={mediaInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleFileUpload(e, 'media')} />
        
        {isRecording ? (
          <div className="flex items-center gap-4 bg-red-50 p-2 rounded-xl border border-red-100 animate-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-red-600">Đang ghi âm...</span>
              <div className="flex-1 h-1 bg-red-200 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 animate-progress" style={{ width: `${(recordingDuration % 10) * 10}%` }} />
              </div>
              <span className="text-xs font-mono text-red-500">{Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}</span>
            </div>
            <button onClick={stopVoiceRecording} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm transition-all active:scale-95">
              <MicOff size={18} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"><FileIcon size={18} /></button>
            <button type="button" onClick={() => mediaInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"><Image size={18} /></button>
            <input
              type="text"
              value={editingMsg ? editContent : newMessage}
              onChange={e => { editingMsg ? setEditContent(e.target.value) : setNewMessage(e.target.value); notifyTyping(); }}
              placeholder={editingMsg ? 'Chỉnh sửa tin nhắn...' : filesQueue.length > 0 ? 'Nhấn gửi để tải lên các tệp...' : 'Nhập tin nhắn...'}
              className="flex-1 px-4 py-2.5 bg-gray-100 focus:bg-white rounded-xl border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none text-sm transition-all"
              disabled={isSending}
            />
            {/* Voice recording button */}
            <button type="button" onClick={startVoiceRecording}
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all"
              title="Ghi âm giọng nói">
              <Mic size={18} />
            </button>
            <button type="submit" disabled={(!(editingMsg ? editContent : newMessage).trim() && filesQueue.length === 0) || isSending}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl transition-all shadow-md active:scale-95">
              {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </button>
          </form>
        )}
      </div>



      {/* Forward Modal */}
      {forwardMsg && (
        <div className="absolute inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => { setForwardMsg(null); setForwardTargets([]); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-96 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-800">Chuyển tiếp tin nhắn</span>
              <button onClick={() => { setForwardMsg(null); setForwardTargets([]); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-4 py-2 text-xs bg-gray-50 border-b border-gray-100 truncate text-gray-500">
              "{forwardMsg.content || 'File/Media'}"
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {allConversations.map((c: any) => {
                const isPriv = c.type === 'private';
                const name = isPriv ? c.participants?.find((p: any) => (p.userId?._id || p.userId) !== user?.sub)?.userId?.name || 'Người dùng' : c.name;
                const selected = forwardTargets.includes(c._id);
                return (
                  <button key={c._id} onClick={() => setForwardTargets(prev => selected ? prev.filter(id => id !== c._id) : [...prev, c._id])}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${selected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs ${selected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>
                      {selected && <Check size={12} />}
                    </div>
                    <span className="text-sm font-medium text-gray-700 truncate">{name}</span>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => { setForwardMsg(null); setForwardTargets([]); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Hủy</button>
              <button onClick={handleForward} disabled={!forwardTargets.length}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 transition-colors">
                Gửi ({forwardTargets.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {imageViewer && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={() => setImageViewer(null)}>
          <div className="flex justify-between items-center p-4 text-white z-10">
            <div className="flex flex-col">
              <span className="font-medium">{imageViewer.images[imageViewer.startIndex]?.fileName || 'Hình ảnh'}</span>
              <span className="text-xs text-white/70">
                {formatFileSize(imageViewer.images[imageViewer.startIndex]?.fileSize || 0)} • {imageViewer.startIndex + 1} / {imageViewer.images.length}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                className="p-2 hover:bg-white/10 rounded-full transition-colors" 
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(imageViewer.images[imageViewer.startIndex]?.url || imageViewer.images[imageViewer.startIndex]?.fileUrl, '_blank');
                }}
                title="Mở trong thẻ mới"
              >
                <ExternalLink size={20} />
              </button>
              <button className="p-2 hover:bg-white/10 rounded-full transition-colors" onClick={() => setImageViewer(null)}>
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 relative" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute left-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full disabled:opacity-0 transition-all"
              disabled={imageViewer.startIndex === 0}
              onClick={() => setImageViewer(prev => prev ? { ...prev, startIndex: prev.startIndex - 1 } : null)}
            >
              <ChevronLeft size={28} />
            </button>
            <img 
              src={imageViewer.images[imageViewer.startIndex]?.url || imageViewer.images[imageViewer.startIndex]?.fileUrl} 
              alt="viewer" 
              className="max-w-full max-h-[85vh] object-contain rounded-sm shadow-2xl"
            />
            <button 
              className="absolute right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full disabled:opacity-0 transition-all"
              disabled={imageViewer.startIndex === imageViewer.images.length - 1}
              onClick={() => setImageViewer(prev => prev ? { ...prev, startIndex: prev.startIndex + 1 } : null)}
            >
              <ChevronRight size={28} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;
