import React from 'react';
import { MessageSquare, Users, Cloud, Briefcase, Settings, LogOut, User } from 'lucide-react';
import Avatar from '../ui/Avatar';

interface SidebarPrimaryProps {
  user: any;
  currentView: string;
  setCurrentView: (view: 'chats' | 'contacts') => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  isSettingsOpen: boolean;
}

const SidebarPrimary: React.FC<SidebarPrimaryProps> = ({ 
  user, 
  currentView, 
  setCurrentView, 
  onOpenSettings, 
  onLogout,
  isSettingsOpen
}) => {
  return (
    <aside className="w-[58px] h-full bg-[#0068ff] flex flex-col items-center py-4 flex-shrink-0 z-50 shadow-xl">
      {/* User Profile */}
      <div 
        className="cursor-pointer mb-6 hover:scale-105 transition-all shadow-lg group relative"
        onClick={onOpenSettings}
        title="Cài đặt tài khoản"
      >
        <Avatar name={user?.name} size="md" className="border-2 border-white/30" />
        <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      {/* Navigation */}
      <div className="flex flex-col gap-1 w-full">
        <button 
          onClick={() => setCurrentView('chats')}
          className={`w-full py-3 flex justify-center transition-all relative group ${currentView === 'chats' ? 'bg-[#005ae0] text-white' : 'text-white/70 hover:bg-white/10'}`}
        >
          <MessageSquare size={22} className="group-hover:scale-110 transition-transform" />
          {currentView === 'chats' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />}
        </button>
        <button 
          onClick={() => setCurrentView('contacts')}
          className={`w-full py-3 flex justify-center transition-all relative group ${currentView === 'contacts' ? 'bg-[#005ae0] text-white' : 'text-white/70 hover:bg-white/10'}`}
        >
          <Users size={22} className="group-hover:scale-110 transition-transform" />
          {currentView === 'contacts' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />}
        </button>
      </div>

      {/* Utilities & Bottom Actions */}
      <div className="mt-auto flex flex-col items-center gap-1 w-full pb-2">
        <button className="w-full py-3 flex justify-center text-white/70 hover:bg-white/10 transition-all group">
          <Cloud size={20} className="group-hover:scale-110 transition-transform" />
        </button>
        <button className="w-full py-3 flex justify-center text-white/70 hover:bg-white/10 transition-all group">
          <Briefcase size={20} className="group-hover:scale-110 transition-transform" />
        </button>
        
        <button 
          onClick={onOpenSettings}
          className={`w-full py-3 flex justify-center transition-all relative group ${isSettingsOpen ? 'bg-[#005ae0] text-white' : 'text-white/70 hover:bg-white/10'}`}
        >
          <Settings size={22} className="group-hover:rotate-90 transition-all duration-500" />
        </button>
        
        <button 
          onClick={onLogout}
          className="w-full py-3 flex justify-center text-white/70 hover:bg-red-500/30 hover:text-red-100 transition-all group"
        >
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
};

export default SidebarPrimary;
