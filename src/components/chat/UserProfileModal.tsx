import React, { useEffect, useState } from "react";
import { X, MessageSquare, Ban, ShieldCheck, Loader2, Phone, Mail, Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { userService } from "../../services/userService";
import { conversationService } from "../../services/conversationService";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";

interface UserProfileModalProps {
    userId: string;
    onClose: () => void;
}

const statusLabel: Record<string, string> = {
    online: "Đang hoạt động",
    away: "Vắng mặt",
    busy: "Bận",
    offline: "Ngoại tuyến",
};

const statusDotColor: Record<string, string> = {
    online: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-300",
};

// Format "lần cuối truy cập" kiểu tương đối (vd: "5 phút trước")
const formatLastSeen = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay} ngày trước`;
    return date.toLocaleDateString("vi-VN");
};

// Format ngày tham gia (vd: "Tháng 3, 2026")
const formatJoinedDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
};

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose }) => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBlocked, setIsBlocked] = useState(false);
    const [isBlockLoading, setIsBlockLoading] = useState(false);
    const [isStartingChat, setIsStartingChat] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            try {
                const [profileData, blockedList] = await Promise.all([
                    userService.getCurrentProfile(userId),
                    userService.getBlockedUsers().catch(() => []),
                ]);
                if (cancelled) return;
                setProfile(profileData);
                const blockedIds = (blockedList || []).map(
                    (u: any) => u._id || u.userId?._id || u.userId,
                );
                setIsBlocked(blockedIds.includes(userId));
            } catch {
                if (!cancelled) toast.error("Không thể tải thông tin người dùng");
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [userId]);

    const handleStartChat = async () => {
        setIsStartingChat(true);
        try {
            const conv = await conversationService.createPrivateConversation(userId);
            onClose();
            navigate("/chat/" + conv._id);
        } catch {
            toast.error("Không thể bắt đầu trò chuyện");
        } finally {
            setIsStartingChat(false);
        }
    };

    const handleToggleBlock = async () => {
        setIsBlockLoading(true);
        try {
            if (isBlocked) {
                await userService.unblockUser(userId);
                setIsBlocked(false);
                toast.success("Đã bỏ chặn");
            } else {
                if (!confirm(`Chặn ${profile?.name || "người dùng này"}?`)) {
                    setIsBlockLoading(false);
                    return;
                }
                await userService.blockUser(userId);
                setIsBlocked(true);
                toast.success("Đã chặn");
            }
        } catch {
            toast.error("Thao tác thất bại");
        } finally {
            setIsBlockLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl bg-white">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
                >
                    <X size={16} />
                </button>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 size={24} className="animate-spin text-blue-500" />
                        <span className="text-sm text-gray-400">Đang tải...</span>
                    </div>
                ) : !profile ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2">
                        <span className="text-sm text-gray-400">
                            Không tìm thấy người dùng
                        </span>
                    </div>
                ) : (
                    <>
                        {/* Cover + avatar */}
                        <div className="h-24 bg-gradient-to-br from-blue-500 to-purple-600 relative">
                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                                <div className="relative">
                                    <Avatar
                                        src={profile.avatar}
                                        name={profile.name}
                                        size="xl"
                                        className="border-4 border-white shadow-lg"
                                    />
                                    <span
                                        className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${
                                            statusDotColor[profile.status] ||
                                            statusDotColor.offline
                                        }`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-12 pb-6 px-6 flex flex-col items-center text-center">
                            <h2 className="text-lg font-bold text-gray-900">
                                {profile.name}
                            </h2>

                            <div className="flex items-center gap-1.5 mt-1 text-sm">
                                <span
                                    className={`w-2 h-2 rounded-full ${
                                        statusDotColor[profile.status] ||
                                        statusDotColor.offline
                                    }`}
                                />
                                <span className="text-gray-500">
                                    {statusLabel[profile.status] || "Ngoại tuyến"}
                                </span>
                            </div>

                            {profile.customStatusMessage && (
                                <p className="mt-2 text-sm text-gray-600 italic bg-gray-50 px-3 py-1.5 rounded-xl">
                                    "{profile.customStatusMessage}"
                                </p>
                            )}

                            {/* Lần cuối truy cập — chỉ hiện khi BE trả về (đã qua check privacy) */}
                            {profile.status !== "online" &&
                                formatLastSeen(profile.lastSeen) && (
                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                                        <Clock size={12} />
                                        Truy cập {formatLastSeen(profile.lastSeen)}
                                    </div>
                                )}

                            {/* Giới thiệu bản thân */}
                            {profile.bio && (
                                <p className="mt-3 text-sm text-gray-700 leading-relaxed px-2">
                                    {profile.bio}
                                </p>
                            )}

                            {/* Ngày tham gia */}
                            {formatJoinedDate(profile.createdAt) && (
                                <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
                                    <Calendar size={12} />
                                    Tham gia {formatJoinedDate(profile.createdAt)}
                                </div>
                            )}

                            {/* Info bổ sung — chỉ hiện nếu BE trả về (tùy quyền riêng tư) */}
                            {(profile.email || profile.phoneNumber) && (
                                <div className="w-full mt-4 space-y-2 text-left">
                                    {profile.email && (
                                        <div className="flex items-center gap-2.5 text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded-xl">
                                            <Mail size={14} className="text-gray-400" />
                                            {profile.email}
                                        </div>
                                    )}
                                    {profile.phoneNumber && (
                                        <div className="flex items-center gap-2.5 text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded-xl">
                                            <Phone size={14} className="text-gray-400" />
                                            {profile.phoneNumber}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="w-full mt-5 flex gap-2">
                                <button
                                    onClick={handleStartChat}
                                    disabled={isStartingChat}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors text-sm"
                                >
                                    {isStartingChat ? (
                                        <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                        <MessageSquare size={15} />
                                    )}
                                    Nhắn tin
                                </button>
                                <button
                                    onClick={handleToggleBlock}
                                    disabled={isBlockLoading}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-4 font-bold rounded-xl transition-colors text-sm ${
                                        isBlocked
                                            ? "bg-green-50 text-green-600 hover:bg-green-100"
                                            : "bg-red-50 text-red-600 hover:bg-red-100"
                                    }`}
                                    title={isBlocked ? "Bỏ chặn" : "Chặn"}
                                >
                                    {isBlockLoading ? (
                                        <Loader2 size={15} className="animate-spin" />
                                    ) : isBlocked ? (
                                        <ShieldCheck size={15} />
                                    ) : (
                                        <Ban size={15} />
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default UserProfileModal;