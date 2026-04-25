import React, { useState } from 'react';
import { Search, Loader2, X, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import { userService } from '../../services/userService';
import { conversationService } from '../../services/conversationService';
import toast from 'react-hot-toast';

interface CreateGroupModalProps {
  onClose: () => void;
  onSuccess: (newConversationId: string) => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onSuccess }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      // Trying phone search first as it's common in Zalo-style apps
      const data = await userService.searchByPhone(searchQuery);
      setSearchResults(data ? [data] : []);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleUserSelection = (user: any) => {
    if (selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      return toast.error('Vui lòng nhập tên nhóm và chọn ít nhất 1 thành viên');
    }

    setIsCreating(true);
    try {
      const userIds = selectedUsers.map(u => u._id);
      const newGroup = await conversationService.createGroupConversation(groupName, userIds);
      toast.success('Tạo nhóm thành công!');
      onSuccess(newGroup._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tạo nhóm');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Tạo nhóm trò chuyện" maxWidth="max-w-[460px]">
      <div className="p-6">
        {/* Group Name Input */}
        <div className="mb-6">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1.5 block">Tên nhóm</label>
          <input 
            type="text" 
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Nhập tên nhóm..." 
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-medium"
          />
        </div>

        {/* Search Users */}
        <div className="mb-4">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1 mb-1.5 block">Thêm thành viên</label>
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
              {isSearching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm số điện thoại..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all text-sm"
            />
          </form>
        </div>

        {/* Selected Users Badges */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
            {selectedUsers.map(user => (
              <div key={user._id} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg shadow-sm border border-blue-100 text-xs font-bold text-blue-700">
                <Avatar name={user.name} size="xs" />
                {user.name}
                <button onClick={() => toggleUserSelection(user)} className="text-gray-400 hover:text-red-500 ml-1">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="max-h-[200px] overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50 mb-6 shadow-inner bg-gray-50/30">
            {searchResults.map(user => {
              const isSelected = !!selectedUsers.find(u => u._id === user._id);
              return (
                <div 
                  key={user._id} 
                  onClick={() => toggleUserSelection(user)}
                  className="flex items-center justify-between p-3 hover:bg-white cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={user.name} size="sm" />
                    <div className="font-medium text-sm text-gray-800">{user.name}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'}`}>
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        <button 
          onClick={handleCreateGroup}
          disabled={isCreating || !groupName.trim() || selectedUsers.length === 0}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2 mt-4"
        >
          {isCreating && <Loader2 className="animate-spin" size={18} />}
          Tạo nhóm ({selectedUsers.length})
        </button>
      </div>
    </Modal>
  );
};

export default CreateGroupModal;
