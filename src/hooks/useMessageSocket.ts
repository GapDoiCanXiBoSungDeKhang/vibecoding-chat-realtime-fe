import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";

interface UseMessageSocketProps {
    activeChat: string | null;
    currentUserId?: string;
    onNewMessage: (message: any) => void;
    onConversationUpdate: () => void;
    // Fine-grained handlers for inline state updates
    onMessageEdited?: (payload: any) => void;
    onMessageDeleted?: (payload: any) => void;
    onMessageReacted?: (payload: any) => void;
    onMessageSeen?: (payload: any) => void;
    onMessagePinned?: (payload: any) => void;
    onMessageUnpinned?: (payload: any) => void;
    onMessageForwarded?: (payload: any) => void;
}

export const useMessageSocket = ({
    activeChat,
    currentUserId,
    onNewMessage,
    onConversationUpdate,
    onMessageEdited,
    onMessageDeleted,
    onMessageReacted,
    onMessageSeen,
    onMessagePinned,
    onMessageUnpinned,
    onMessageForwarded,
}: UseMessageSocketProps) => {
    const {
        socket,
        joinConversation,
        leaveConversation,
        emitTypingStart,
        emitTypingStop,
    } = useSocket();
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!activeChat) return;

        joinConversation(activeChat);

        if (!socket) return;

        // ── New message arrival events ──
        const arrivalEvents = [
            "new_message",
            "new_message_file",
            "new_message_media",
            "new_message_voice",
            "new_message_linkPreview",
            "new_message_call",
            "message_system_room",
        ];

        arrivalEvents.forEach((evt) => {
            socket.on(evt, (payload: any) => {
                onNewMessage(payload);
            });
        });

        // ── message_edited ──
        // Payload: full populated message object
        socket.on("message_edited", (payload: any) => {
            if (onMessageEdited) {
                onMessageEdited(payload);
            } else {
                onConversationUpdate();
            }
        });

        // ── message_deleted ──
        // Payload: { messageId, scope: 'everyone' | 'self', deletedBy }
        socket.on("message_deleted", (payload: any) => {
            if (onMessageDeleted) {
                onMessageDeleted(payload);
            } else {
                onConversationUpdate();
            }
        });

        // ── message_reacted ──
        // Payload: { messageId, userId, emoji, action: 'add' | 'remove' }
        socket.on("message_reacted", (payload: any) => {
            if (onMessageReacted) {
                onMessageReacted(payload);
            } else {
                onConversationUpdate();
            }
        });

        // ── message_seen ──
        // Payload: { conversationId, messageId, seenBy: { _id, name, avatar } }
        socket.on("message_seen", (payload: any) => {
            if (onMessageSeen) {
                onMessageSeen(payload);
            } else {
                onConversationUpdate();
            }
        });

        // ── message_pinned ──
        // Payload: { messageId, isPinned: true, pinByUser, pinnedAt }
        socket.on("message_pinned", (payload: any) => {
            if (onMessagePinned) {
                onMessagePinned(payload);
            } else {
                onConversationUpdate();
            }
        });

        // ── message_unpinned ──
        // Payload: { messageId, isPinned: false, pinByUser: null, pinnedAt: null }
        socket.on("message_unpinned", (payload: any) => {
            if (onMessageUnpinned) {
                onMessageUnpinned(payload);
            } else {
                onConversationUpdate();
            }
        });

        // ── message_forwarded ──
        socket.on("message_forwarded", (payload: any) => {
            if (onMessageForwarded) {
                onMessageForwarded(payload);
            } else {
                onNewMessage(payload);
            }
        });

        // ── mention_received ──
        socket.on("mention_received", () => {
            onConversationUpdate();
        });

        // ── announcement_created ──
        socket.on("announcement_created", () => {
            onConversationUpdate();
        });

        // ── Typing ──
        socket.on("user_typing", (payload: any) => {
            if (
                payload.conversationId === activeChat &&
                payload.userId !== currentUserId
            ) {
                setIsTyping(true);
            }
        });

        socket.on("user_stopped_typing", (payload: any) => {
            if (
                payload.conversationId === activeChat &&
                payload.userId !== currentUserId
            ) {
                setIsTyping(false);
            }
        });

        // ── Group management events ──
        const groupEvents = [
            "group_member_added",
            "group_member_removed",
            "group_member_left",
            "group_role_changed",
            "group_dissolved",
        ];
        groupEvents.forEach((evt) => {
            socket.on(evt, (payload: any) => {
                if (payload.conversationId === activeChat) {
                    onConversationUpdate();
                }
            });
        });

        return () => {
            leaveConversation(activeChat);
            if (socket) {
                const allEvents = [
                    ...arrivalEvents,
                    "message_edited",
                    "message_deleted",
                    "message_reacted",
                    "message_seen",
                    "message_pinned",
                    "message_unpinned",
                    "message_forwarded",
                    "mention_received",
                    "announcement_created",
                    "user_typing",
                    "user_stopped_typing",
                    ...groupEvents,
                ];
                allEvents.forEach((evt) => socket.off(evt));
            }
        };
    }, [activeChat, socket, currentUserId]);

    const notifyTyping = () => {
        if (activeChat) {
            emitTypingStart(activeChat);
            if (typingTimeoutRef.current)
                clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = window.setTimeout(() => {
                emitTypingStop(activeChat);
            }, 1500);
        }
    };

    const stopTyping = () => {
        if (activeChat) {
            if (typingTimeoutRef.current)
                clearTimeout(typingTimeoutRef.current);
            emitTypingStop(activeChat);
        }
    };

    return { isTyping, notifyTyping, stopTyping };
};
