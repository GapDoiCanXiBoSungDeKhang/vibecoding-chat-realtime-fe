import React, { useEffect, useState } from 'react';
import { X, Search, Phone, User, Loader2, Send } from 'lucide-react';
import { friendService } from '../../services/friendService';
import toast from 'react-hot-toast';

interface AddFriendModalProps {
  onClose: () => void;
}

const AddFriendModal: React.FC<AddFriendModalProps> = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'phone'>('name');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);

  // Real-time search suggestions logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timer);
  }, [searchQuery, searchType]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      let data;
      if (searchType === 'name') {
        data = await friendService.findByName(searchQuery);
        setResults(Array.isArray(data) ? data : [data]);
      } else {
        data = await friendService.findByPhone(searchQuery);
        setResults(data ? [data] : []);
      }
    } catch (error) {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const sendRequest = async (userId: string) => {
    setIsSending(userId);
    try {
      await friendService.sendFriendRequest(userId, "Hi, I'd like to be your friend!");
      toast.success('Friend request sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setIsSending(null);
    }
  };

  const handleSelectUser = (user: any) => {
    setSearchQuery(user.name);
    // You could also auto-trigger the add logic here if desired
  };

  return (
    <div className="modal-overlay fixed inset-0 bg-black/60 flex justify-center items-center z-[100] backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="modal-content bg-white p-6 rounded-2xl w-full max-w-[420px] relative shadow-2xl animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold mb-6 text-gray-900 pr-6">Thêm bạn</h2>

        <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
          <button 
            onClick={() => { setSearchType('name'); setResults([]); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${searchType === 'name' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <User size={14} /> Tên
          </button>
          <button 
            onClick={() => { setSearchType('phone'); setResults([]); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${searchType === 'phone' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Phone size={14} /> Số điện thoại
          </button>
        </div>

        <div className="relative mb-5 group">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
            {isSearching ? <Loader2 className="animate-spin" size={16} /> : <Search size={18} />}
          </div>
          <input 
            type="text" 
            autoFocus
            placeholder={searchType === 'name' ? "Tìm theo tên..." : "Tìm theo số điện thoại..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-gray-800 bg-gray-50/50 focus:bg-white text-sm"
          />
        </div>

        {/* Suggestions List Section */}
        {searchQuery.length >= 2 && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Suggestions</h3>
            <div className="max-h-[280px] overflow-y-auto rounded-2xl border border-gray-100 divide-y divide-gray-50 shadow-inner bg-gray-50/20">
              {results.length === 0 && !isSearching && (
                <div className="p-10 text-center">
                  <div className="text-gray-300 mb-2 flex justify-center"><Search size={32} /></div>
                  <p className="text-gray-400 text-sm">No users found matching "{searchQuery}"</p>
                </div>
              )}
              
              {results.map((user) => (
                <div 
                  key={user._id} 
                  onClick={() => handleSelectUser(user)}
                  className="flex items-center p-4 hover:bg-white transition-all cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold mr-4 shadow-sm group-hover:scale-105 transition-transform">
                    {user.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email || user.phoneNumber}</div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); sendRequest(user._id); }}
                    disabled={isSending === user._id}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-md hover:shadow-blue-200 transition-all disabled:opacity-50"
                  >
                    {isSending === user._id ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddFriendModal;
