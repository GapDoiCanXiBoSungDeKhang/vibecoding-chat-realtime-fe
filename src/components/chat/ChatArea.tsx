import React from 'react';
import { MessageSquare } from 'lucide-react';

interface ChatAreaProps {
  activeChat: any;
}

const ChatArea: React.FC<ChatAreaProps> = ({ activeChat }) => {
  if (!activeChat) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white animate-in zoom-in-95 duration-700">
        <div className="w-64 h-64 mb-8 drop-shadow-2xl">
           <img 
             src="https://zalo-static.zadn.vn/zalo-pc/static/media/empty-state.39265f24.png" 
             alt="Welcome" 
             className="w-full h-full object-contain opacity-90" 
           />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-4">Chào mừng bạn đến với Zalo Hybrid!</h2>
        <p className="text-gray-500 max-w-md text-base leading-relaxed">
          Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hóa cho máy tính của bạn.
        </p>
        <div className="mt-10 flex gap-3">
          <div className="px-5 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">Cá nhân hóa</div>
          <div className="px-5 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">Bảo mật cao</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 animate-in fade-in duration-500">
      <MessageSquare size={48} className="mb-4 opacity-20" />
      <p className="font-medium">Đang kết nối với cuộc trò chuyện...</p>
      <span className="text-[10px] uppercase tracking-widest mt-1">Hệ thống mã hóa đầu cuối active</span>
    </div>
  );
};

export default ChatArea;
