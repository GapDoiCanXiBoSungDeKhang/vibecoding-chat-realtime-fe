import React from "react";
import { MessageSquare } from "lucide-react";

const ChatPlaceholder: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 p-8 text-center font-sans">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-600 mb-6 shadow-xl shadow-blue-100/50 animate-bounce">
                <MessageSquare size={40} />
            </div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight mb-2">
                chào mừng bạn đến với zalo hybrid
            </h2>
            <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
                hãy chọn một cuộc trò chuyện từ danh sách hoặc thêm bạn mới để bắt đầu nhắn tin thời gian thực.
            </p>
        </div>
    );
};

export default ChatPlaceholder;
