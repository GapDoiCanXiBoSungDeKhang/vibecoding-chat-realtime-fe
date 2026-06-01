import React, { useEffect, useState } from "react";
import { Search, Loader2, X, Check, UserPlus } from "lucide-react";
import Modal from "../ui/Modal";
import Avatar from "../ui/Avatar";
import { friendService } from "../../services/friendService";
import { conversationService } from "../../services/conversationService";
import toast from "react-hot-toast";

interface AddMemberModalProps {
    conversationId: string;
    participants: any[];
    conversationName?: string;
    onClose: () => void;
    onSuccess: () => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
    conversationId,
    participants,
    conversationName,
    onClose,
    onSuccess,
}) => {
    const [friends, setFriends] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Extract existing participant IDs to prevent duplicates
    const existingMemberIds = new Set(
        (participants || []).map((p: any) => p.userId?._id || p.userId),
    );

    useEffect(() => {
        const loadFriends = async () => {
            try {
                const data = await friendService.getFriends();
                // Only list friends who are not already in the group
                const filteredFriends = (data || []).filter(
                    (friend: any) => !existingMemberIds.has(friend._id),
                );
                setFriends(filteredFriends);
            } catch (error) {
                toast.error("Không thể tải danh sách bạn bè");
            } finally {
                setIsLoading(false);
            }
        };
        loadFriends();
    }, [participants]);

    const filteredFriends = friends.filter((friend) =>
        friend.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const toggleUserSelection = (user: any) => {
        if (selectedUsers.find((u) => u._id === user._id)) {
            setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
        } else {
            setSelectedUsers([...selectedUsers, user]);
        }
    };

    const handleAddMembers = async () => {
        if (selectedUsers.length === 0) {
            return toast.error("Vui lòng chọn ít nhất 1 người bạn để thêm");
        }

        setIsAdding(true);
        try {
            const userIds = selectedUsers.map((u) => u._id);
            const res = await conversationService.addMembers(
                conversationId,
                userIds,
            );

            // If the backend returns an array (regular member request) vs conversation object
            if (Array.isArray(res)) {
                toast.success(
                    "Đã gửi yêu cầu thêm thành viên đến Quản trị viên!",
                );
            } else {
                toast.success("Thêm thành viên vào nhóm thành công!");
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || "Không thể thêm thành viên",
            );
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={`Thêm thành viên ${conversationName ? `- ${conversationName}` : ""}`}
            maxWidth="max-w-[460px]"
        >
            <div className="p-6">
                {/* Search Input */}
                <div className="mb-4">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1.5 block">
                        Tìm kiếm bạn bè
                    </label>
                    <div className="relative group">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Nhập tên người bạn cần thêm..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-medium focus:ring-4 focus:ring-blue-500/10"
                        />
                    </div>
                </div>

                {/* Selected Users Badges */}
                {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in duration-200">
                        {selectedUsers.map((user) => (
                            <div
                                key={user._id}
                                className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg shadow-sm border border-blue-100 text-xs font-bold text-blue-700"
                            >
                                <Avatar name={user.name} size="xs" />
                                {user.name}
                                <button
                                    onClick={() => toggleUserSelection(user)}
                                    className="text-gray-400 hover:text-red-500 ml-1"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Friends to Add List */}
                <div className="max-h-[220px] overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50 mb-6 shadow-inner bg-gray-50/30">
                    {isLoading ? (
                        <div className="py-8 flex justify-center text-blue-500">
                            <Loader2 className="animate-spin" size={20} />
                        </div>
                    ) : filteredFriends.length > 0 ? (
                        filteredFriends.map((user) => {
                            const isSelected = !!selectedUsers.find(
                                (u) => u._id === user._id,
                            );
                            return (
                                <div
                                    key={user._id}
                                    onClick={() => toggleUserSelection(user)}
                                    className="flex items-center justify-between p-3 hover:bg-white cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar name={user.name} size="sm" />
                                        <div className="font-semibold text-sm text-gray-800 group-hover:text-blue-600 transition-colors">
                                            {user.name}
                                        </div>
                                    </div>
                                    <div
                                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? "bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-200" : "border-gray-300"}`}
                                    >
                                        {isSelected && (
                                            <Check size={14} strokeWidth={3} />
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-8 text-center text-gray-400 text-xs italic">
                            {searchQuery
                                ? "Không tìm thấy ai phù hợp"
                                : "Không tìm thấy bạn bè nào chưa vào nhóm"}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                <button
                    onClick={handleAddMembers}
                    disabled={isAdding || selectedUsers.length === 0}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:shadow-none text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all flex justify-center items-center gap-2"
                >
                    {isAdding ? (
                        <Loader2 className="animate-spin" size={18} />
                    ) : (
                        <UserPlus size={16} />
                    )}
                    Thêm thành viên ({selectedUsers.length})
                </button>
            </div>
        </Modal>
    );
};

export default AddMemberModal;
