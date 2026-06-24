import React from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import ChatArea from "../components/chat/ChatArea";
import ConversationPanel from "../components/chat/ConversationPanel";

const ChatContent: React.FC = () => {
    const {
        activeChat,
        activeChatInfo,
        isPanelOpen,
        setIsPanelOpen,
        currentUserId,
        fetchConversations,
        pendingGroupRequests = {},
        reloadPendingTrigger = 0,
        clearPendingGroupRequests,
    } = useOutletContext<any>();
    const navigate = useNavigate();

    return (
        <div className="flex-1 flex h-full overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
                <ChatArea
                    activeChat={activeChat}
                    onClose={() => {
                        navigate("/chat");
                        setIsPanelOpen(false);
                    }}
                    onOpenInfo={() => {
                        if (activeChatInfo) setIsPanelOpen((p: boolean) => !p);
                    }}
                />
            </div>
            {isPanelOpen && activeChatInfo && activeChat && (
                <ConversationPanel
                    conversationId={activeChat}
                    conversationInfo={activeChatInfo}
                    currentUserId={currentUserId}
                    onClose={() => setIsPanelOpen(false)}
                    onConversationAction={() => {
                        setIsPanelOpen(false);
                        navigate("/chat");
                        fetchConversations();
                    }}
                    onRefresh={fetchConversations}
                    pendingMemberRequests={pendingGroupRequests[activeChat] || 0}
                    reloadPendingTrigger={reloadPendingTrigger}
                    onMembersTabOpen={() => clearPendingGroupRequests?.(activeChat)}
                />
            )}
        </div>
    );
};

export default ChatContent;