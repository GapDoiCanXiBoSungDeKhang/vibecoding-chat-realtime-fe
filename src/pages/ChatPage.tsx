import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate, Outlet } from "react-router-dom";
import { conversationService } from "../services/conversationService";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import SettingsModal from "../components/chat/SettingsModal";
import SidebarPrimary from "../components/chat/SidebarPrimary";
import SidebarSecondary from "../components/chat/SidebarSecondary";
import CreateGroupModal from "../components/chat/CreateGroupModal";
import CreatePrivateChatModal from "../components/chat/CreatePrivateChatModal";
import { ChatLayout } from "../layouts/ChatLayout";
import { useConversationSocket } from "../hooks/useConversationSocket";
import { useFriendSocket } from "../hooks/useFriendSocket";
import { useGlobalNotifications } from "../hooks/useGlobalNotifications";
import { useSocket } from "../context/SocketContext";
import { friendService } from "../services/friendService";

const ChatPage: React.FC = () => {
    const { logout, user } = useAuth();
    const { joinConversation } = useSocket();

    const { chatId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [conversations, setConversations] = useState<any[]>([]);

    const currentView = location.pathname.startsWith("/friends")
        ? "contacts"
        : "chats";
    const activeChat = chatId || null;

    const [prevActiveChat, setPrevActiveChat] = useState<string | null>(null);
    const [unreadMentions, setUnreadMentions] = useState<Set<string>>(new Set());
    const [pendingFriendCount, setPendingFriendCount] = useState(0);
    // Map conversationId -> số pending join requests chưa xem
    const [pendingGroupRequests, setPendingGroupRequests] = useState<Record<string, number>>({});
    // Trigger reload ConversationPanel pending list khi socket fire
    const [reloadPendingTrigger, setReloadPendingTrigger] = useState(0);

    useGlobalNotifications(
        activeChat,
        (id) => {
            navigate("/chat/" + id);
        },
        (id) => {
            setUnreadMentions((prev) => new Set(prev).add(id));
        },
    );

    const [activeChatInfo, setActiveChatInfo] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isCreatePrivateOpen, setIsCreatePrivateOpen] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Fetch pending friend requests count on mount
    useEffect(() => {
        friendService.getFriendRequests()
            .then((data) => setPendingFriendCount(data?.length ?? 0))
            .catch(() => {});
    }, []);

    // Restore pending group request badges sau khi refresh
    // Fetch pending count cho tất cả group conversations
    useEffect(() => {
        const restorePendingGroupBadges = async () => {
            try {
                const convs = await conversationService.getConversations();
                const groups = (convs || []).filter((c: any) => c.type === "group");
                const counts: Record<string, number> = {};
                await Promise.all(
                    groups.map(async (g: any) => {
                        try {
                            const requests = await conversationService.listJoinRequests(g._id);
                            if (requests?.length > 0) {
                                counts[g._id] = requests.length;
                            }
                        } catch {
                            // Bỏ qua nếu lỗi (không đủ quyền hoặc network)
                        }
                    })
                );
                if (Object.keys(counts).length > 0) {
                    setPendingGroupRequests(counts);
                }
            } catch {
                // Bỏ qua
            }
        };
        restorePendingGroupBadges();
    }, []);

    // Reset badge khi user vào tab contacts
    useEffect(() => {
        if (currentView === "contacts") {
            setPendingFriendCount(0);
        }
    }, [currentView]);

    const fetchConversations = async () => {
        try {
            const data = await conversationService.getConversations();
            setConversations(data);
        } catch {
            toast.error("Không thể tải danh sách trò chuyện");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    const { isConnected } = useSocket();
    useEffect(() => {
        if (isConnected && conversations.length > 0) {
            conversations.forEach((conv: any) => {
                joinConversation(conv._id);
            });
        }
    }, [isConnected, conversations, joinConversation]);

    useConversationSocket({
        onUpdate: fetchConversations,
        onJoinRequested: (payload) => {
            const cid = payload?.conversationId;
            if (!cid) return;
            setPendingGroupRequests(prev => ({
                ...prev,
                [cid]: (prev[cid] || 0) + 1,
            }));
            setReloadPendingTrigger(prev => prev + 1);
        },
        onForceLeave: (cid, reason) => {
            // Nếu đang mở đúng conversation bị xóa/rời/giải tán → navigate ra
            if (activeChat === cid || window.location.pathname.includes(cid)) {
                if (reason === 'dissolved') {
                    toast.error("Nhóm đã bị giải tán");
                } else if (reason === 'removed') {
                    toast.error("Bạn đã bị xóa khỏi nhóm");
                } else {
                    toast.success("Đã rời nhóm");
                }
                navigate("/chat");
            }
        },
    });

    useFriendSocket({
        onUpdate: fetchConversations,
        onReceived: () => {
            // Chỉ tăng badge nếu user không đang ở tab contacts
            if (currentView !== "contacts") {
                setPendingFriendCount((prev) => prev + 1);
            }
        },
        onAccepted: async (conversationId) => {
            await fetchConversations();
            navigate("/chat/" + conversationId);
        },
    });

    useEffect(() => {
        if (activeChat) {
            const found = conversations.find((c) => c._id === activeChat);
            if (found) setActiveChatInfo(found);
        } else {
            setActiveChatInfo(null);
        }
    }, [activeChat, conversations]);

    useEffect(() => {
        if (activeChat !== prevActiveChat) {
            setIsPanelOpen(false);
            setPrevActiveChat(activeChat);
        }
    }, [activeChat, prevActiveChat]);

    const handleOpenInfo = (conv: any) => {
        setActiveChatInfo(conv);
        setIsPanelOpen(true);
        if (activeChat !== conv._id) {
            navigate("/chat/" + conv._id);
        }
    };

    const handleStartChat = async (userId: string) => {
        try {
            const newConv =
                await conversationService.createPrivateConversation(userId);
            await fetchConversations();
            navigate("/chat/" + newConv._id);
        } catch {
            toast.error("Không thể tạo cuộc trò chuyện");
        }
    };

    const handleGroupCreated = async (newConvId: string) => {
        setIsCreateGroupOpen(false);
        await fetchConversations();
        navigate("/chat/" + newConvId);
    };

    return (
        <ChatLayout
            primarySidebar={
                <SidebarPrimary
                    user={user}
                    currentView={currentView}
                    setCurrentView={(view) =>
                        navigate(view === "contacts" ? "/friends" : "/chat")
                    }
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onLogout={logout}
                    isSettingsOpen={isSettingsOpen}
                    pendingFriendCount={pendingFriendCount}
                />
            }
            secondarySidebar={
                <SidebarSecondary
                    currentView={currentView}
                    conversations={conversations}
                    isLoading={isLoading}
                    onSelectChat={(id) => {
                        navigate("/chat/" + id);
                        setUnreadMentions((prev) => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                        });
                        // Reset pending group request badge khi mở conversation đó
                        setPendingGroupRequests(prev => {
                            const next = { ...prev };
                            delete next[id];
                            return next;
                        });
                    }}
                    activeChatId={activeChat}
                    unreadMentions={unreadMentions}
                    pendingGroupRequests={pendingGroupRequests}
                    onCreateGroup={() => setIsCreateGroupOpen(true)}
                    onCreatePrivate={() => setIsCreatePrivateOpen(true)}
                    currentUserId={user?.sub || ""}
                    onOpenInfo={handleOpenInfo}
                    onRefresh={fetchConversations}
                />
            }
        >
            {/* Modals */}
            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
            {isCreateGroupOpen && (
                <CreateGroupModal
                    onClose={() => setIsCreateGroupOpen(false)}
                    onSuccess={handleGroupCreated}
                />
            )}
            {isCreatePrivateOpen && (
                <CreatePrivateChatModal
                    onClose={() => setIsCreatePrivateOpen(false)}
                    onSuccess={async (convId) => {
                        setIsCreatePrivateOpen(false);
                        await fetchConversations();
                        navigate("/chat/" + convId);
                    }}
                />
            )}

            {/* Sub-routing outlet */}
            <Outlet
                context={{
                    activeChat,
                    activeChatInfo,
                    isPanelOpen,
                    setIsPanelOpen,
                    currentUserId: user?.sub || "",
                    fetchConversations,
                    handleStartChat,
                    handleOpenInfo,
                    pendingGroupRequests,
                    reloadPendingTrigger,
                    clearPendingGroupRequests: (cid: string) =>
                        setPendingGroupRequests(prev => {
                            const next = { ...prev };
                            delete next[cid];
                            return next;
                        }),
                }}
            />
        </ChatLayout>
    );
};

export default ChatPage;