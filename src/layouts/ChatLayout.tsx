import React, { type ReactNode } from 'react';

interface ChatLayoutProps {
  primarySidebar: ReactNode;
  secondarySidebar: ReactNode;
  children: ReactNode;
  // true khi đang xem 1 cuộc trò chuyện cụ thể hoặc trang /friends —
  // trên mobile chỉ hiện MỘT panel tại 1 thời điểm (list HOẶC detail),
  // trên desktop (md+) vẫn hiện cả 3 cột như cũ, không đổi gì
  showDetail?: boolean;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({
  primarySidebar,
  secondarySidebar,
  children,
  showDetail = false,
}) => {
  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-[14px]">
      {/* List view (icon rail + conversation/contacts list) — ẩn trên mobile
          khi đang xem chi tiết 1 cuộc trò chuyện, luôn hiện trên desktop */}
      <div className={`${showDetail ? 'hidden md:flex' : 'flex'} h-full flex-shrink-0`}>
        {primarySidebar}
      </div>
      <div className={`${showDetail ? 'hidden md:flex' : 'flex flex-1 md:flex-none'} h-full min-w-0`}>
        {secondarySidebar}
      </div>

      {/* Detail view (ChatArea / ContactsView...) — trên mobile chỉ hiện khi
          showDetail=true, chiếm toàn màn hình; trên desktop luôn hiện */}
      <main
        className={`${showDetail ? 'flex' : 'hidden md:flex'} flex-1 h-full relative bg-white overflow-hidden min-w-0`}
      >
        {children}
      </main>
    </div>
  );
};