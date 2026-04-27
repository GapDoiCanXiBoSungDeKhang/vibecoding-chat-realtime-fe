import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Phone, Video, MoreVertical, Loader2, Image, File, Mic, Smile, Reply, Edit2, Trash2, Forward, Pin, X, Check, Info } from 'lucide-react';
import { messageService } from '../../services/messageService';
import { conversationService } from '../../services/conversationService';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';
import { useMessageSocket } from '../../hooks/useMessageSocket';

interface ChatAreaProps { activeChat: string | null; onClose?: () => void; onOpenInfo?: () => void; }

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const formatTime = (d: string) => d ? new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const handleNewMessage = useCallback((payload: any) => {
    const msg = payload.message || payload;
    setMessages(prev => [...prev, msg]);
  }, []);

  const { isTyping, notifyTyping, stopTyping } = useMessageSocket({
    activeChat,
    currentUserId: user?.sub,
    onNewMessage: handleNewMessage,
    onConversationUpdate: () => fetchChatData(),
  });

  useEffect(() => {
    if (activeChat) { fetchChatData(); setIsDropdownOpen(false); setReplyTo(null); setEditingMsg(null); }
  }, [activeChat]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'media') => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activeChat) return;
    try {
      if (type === 'file') await messageService.uploadFiles(activeChat, files);
      else await messageService.uploadMedia(activeChat, files);
      toast.success('Đã gửi');
    } catch { toast.error('Không thể tải lên'); }
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
                      <div className="flex items-center gap-2">
                        <File size={14} className={isMine ? 'text-white/80' : 'text-gray-400'} />
                        <span className="truncate max-w-[200px]">{msg.attachments?.[0]?.fileName || 'File'}</span>
                      </div>
                    ) : msg.type === 'media' && !msg.isDeleted ? (
                      <div className="space-y-1">
                        {msg.attachments?.map((a: any, ai: number) => (
                          <img key={ai} src={a.url || a.fileUrl} alt="" className="rounded-xl max-w-xs max-h-48 object-cover" />
                        ))}
                        {msg.content && <p className="text-xs mt-1 opacity-80">{msg.content}</p>}
                      </div>
                    ) : msg.type === 'voice' && !msg.isDeleted ? (
                      <div className="flex items-center gap-2">
                        <Mic size={14} className={isMine ? 'text-white/80' : 'text-gray-400'} />
                        <span className="text-xs">{msg.attachments?.[0]?.duration ? `${Math.round(msg.attachments[0].duration)}s` : 'Tin nhắn thoại'}</span>
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
                      <div className={`absolute -top-7 ${isMine ? 'right-0' : 'left-0'} hidden group-hover:flex bg-white rounded-full shadow-md border border-gray-100 px-1 py-0.5 gap-0.5`}>
                        <button onClick={() => setEmojiPickerMsg(msg._id)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500" title="Cảm xúc"><Smile size={13} /></button>
                        <button onClick={() => setReplyTo(msg)} className="p-1 hover:bg-gray-100 rounded-full text-gray-500" title="Trả lời"><Reply size={13} /></button>
                        {isMine && <button onClick={() => { setEditingMsg(msg); setEditContent(msg.content); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-500" title="Sửa"><Edit2 size={13} /></button>}
                        <button onClick={() => setContextMenu({ x: 0, y: 0, msg })} className="p-1 hover:bg-gray-100 rounded-full text-gray-500" title="Thêm"><MoreVertical size={13} /></button>
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
                      {Object.entries(grouped).map(([em, cnt]) => (
                        <button key={em} onClick={() => handleReact(msg._id, em)} className="text-xs bg-white border border-gray-200 rounded-full px-1.5 py-0.5 hover:bg-gray-50 shadow-sm">
                          {em} {String(cnt)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Time + seen */}
                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                    {isMine && msg.seenBy?.length > 1 && <span className="text-[10px] text-blue-400">✓✓</span>}
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
        <div className="fixed bg-white border border-gray-100 shadow-xl rounded-xl py-1.5 w-44 z-50 animate-in fade-in zoom-in-95"
          style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
          <button onClick={() => setReplyTo(contextMenu.msg)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"><Reply size={14} /> Trả lời</button>
          {(contextMenu.msg.senderId?._id || contextMenu.msg.senderId) === user?.sub && (
            <button onClick={() => { setEditingMsg(contextMenu.msg); setEditContent(contextMenu.msg.content); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"><Edit2 size={14} /> Chỉnh sửa</button>
          )}
          <button onClick={() => handlePin(contextMenu.msg)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"><Pin size={14} /> Ghim</button>
          <div className="h-px bg-gray-100 my-1" />
          {(contextMenu.msg.senderId?._id || contextMenu.msg.senderId) === user?.sub && (
            <button onClick={() => handleDelete(contextMenu.msg, 'everyone')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14} /> Thu hồi</button>
          )}
          <button onClick={() => handleDelete(contextMenu.msg, 'self')} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><X size={14} /> Xóa phía tôi</button>
        </div>
      )}

      {/* Reply/Edit banner */}
      {(replyTo || editingMsg) && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
          <div className="text-xs text-blue-700">
            <span className="font-bold">{editingMsg ? '✏️ Chỉnh sửa' : `↩ Trả lời ${replyTo?.senderId?.name}`}</span>
            <div className="truncate text-gray-500 max-w-sm">{editingMsg ? editContent : replyTo?.content}</div>
          </div>
          <button onClick={() => { setReplyTo(null); setEditingMsg(null); setEditContent(''); }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-gray-100 flex-shrink-0">
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFileUpload(e, 'file')} />
        <input ref={mediaInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleFileUpload(e, 'media')} />
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"><File size={18} /></button>
          <button type="button" onClick={() => mediaInputRef.current?.click()} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"><Image size={18} /></button>
          <input
            type="text"
            value={editingMsg ? editContent : newMessage}
            onChange={e => { editingMsg ? setEditContent(e.target.value) : setNewMessage(e.target.value); notifyTyping(); }}
            placeholder={editingMsg ? 'Chỉnh sửa tin nhắn...' : 'Nhập tin nhắn...'}
            className="flex-1 px-4 py-2.5 bg-gray-100 focus:bg-white rounded-xl border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 outline-none text-sm transition-all"
            disabled={isSending}
          />
          <button type="submit" disabled={!(editingMsg ? editContent : newMessage).trim() || isSending}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl transition-all shadow-md active:scale-95">
            {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
