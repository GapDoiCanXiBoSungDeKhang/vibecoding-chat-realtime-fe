import React, { ReactNode } from 'react';

interface ChatLayoutProps {
  primarySidebar: ReactNode;
  secondarySidebar: ReactNode;
  children: ReactNode;
}

export const ChatLayout: React.FC<ChatLayoutProps> = ({ primarySidebar, secondarySidebar, children }) => {
  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans text-[14px]">
      {primarySidebar}
      {secondarySidebar}
      <main className="flex-1 h-full relative bg-white flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
};
