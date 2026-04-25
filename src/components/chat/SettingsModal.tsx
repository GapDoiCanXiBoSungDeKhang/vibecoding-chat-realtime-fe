import React, { useState, useEffect } from 'react';
import { Camera, Mail, Phone, User, Shield, Check, Loader2, X, Bell, Moon, Globe, Lock, Settings } from 'lucide-react';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'account' | 'preferences'>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user?.sub) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const data = await userService.getCurrentProfile(user.sub);
      setProfile(data);
      setName(data.name || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setPreview(data.avatar || null);
    } catch (error) {
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phone', phone);
      if (avatar) {
        formData.append('file', avatar);
      }

      await userService.updateProfile(formData);
      toast.success('Settings updated!');
      fetchProfile();
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-3xl h-[70vh] rounded-2xl shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Sidebar */}
        <div className="w-56 bg-gray-50 border-r border-gray-100 p-6 flex flex-col gap-2">
          <h2 className="text-lg font-black mb-6 text-gray-900 px-2">Cài đặt</h2>
          
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-600 hover:bg-gray-200/60'}`}
            >
              <User size={18} /> <span className="font-bold">Thông tin cá nhân</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm ${activeTab === 'account' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-600 hover:bg-gray-200/60'}`}
            >
              <Shield size={18} /> <span className="font-bold">Tài khoản & Bảo mật</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('preferences')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm ${activeTab === 'preferences' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-600 hover:bg-gray-200/60'}`}
            >
              <Settings size={18} /> <span className="font-bold">Cài đặt chung</span>
            </button>
          </nav>
          
          <div className="mt-auto pt-6 border-t border-gray-200/60 px-2">
            <div className="flex items-center gap-2 text-gray-400">
              <Lock size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Mã hóa đầu cuối</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col relative bg-white overflow-hidden">
          <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors z-20 p-1.5 hover:bg-gray-100 rounded-full">
            <X size={24} />
          </button>

          <div className="flex-1 overflow-y-auto p-8 lg:p-10">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={32} />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-8">
                {activeTab === 'profile' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div>
                      <h3 className="text-xl font-black text-gray-900 mb-1">Thông tin cá nhân</h3>
                      <p className="text-gray-500 text-sm">Cập nhật ảnh đại diện và chi tiết hồ sơ của bạn.</p>
                    </div>

                    <div className="flex items-center gap-6 p-6 bg-blue-50/40 rounded-2xl border border-blue-100/50">
                      <div className="relative group">
                        <div className="w-20 h-20 rounded-full bg-blue-200 flex items-center justify-center text-2xl font-bold overflow-hidden ring-4 ring-white shadow-xl">
                          {preview ? <img src={preview} alt="Avatar" className="w-full h-full object-cover" /> : name.charAt(0)}
                        </div>
                        <label htmlFor="settings-avatar" className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-lg hover:scale-110 transition-transform border-2 border-white">
                          <Camera size={14} />
                        </label>
                        <input id="settings-avatar" type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-gray-800">Ảnh đại diện</h4>
                        <p className="text-xs text-gray-500">Dung lượng tối đa: 2MB. Định dạng: JPG, PNG.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <input 
                            type="tel" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'account' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">Account Settings</h3>
                      <p className="text-gray-500">Manage your security and privacy preferences.</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="p-5 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-green-50 rounded-xl text-green-600"><Lock size={20}/></div>
                          <div>
                            <div className="font-bold">Two-Factor Authentication</div>
                            <div className="text-sm text-gray-500">Add an extra layer of security to your account.</div>
                          </div>
                        </div>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium">Enable</button>
                      </div>
                      
                      <div className="p-5 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><Globe size={20}/></div>
                          <div>
                            <div className="font-bold">Active Sessions</div>
                            <div className="text-sm text-gray-500">Manage where you're currently logged in.</div>
                          </div>
                        </div>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium">View All</button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'preferences' && (
                  <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">Preferences</h3>
                      <p className="text-gray-500">Customize your chat experience.</p>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-4">
                          <Moon size={22} className="text-gray-400" />
                          <div>
                            <div className="font-bold">Dark Mode</div>
                            <div className="text-sm text-gray-500">Adjust the appearance of the application.</div>
                          </div>
                        </div>
                        <div className="w-12 h-6 bg-gray-200 rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div></div>
                      </div>

                      <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-4">
                          <Bell size={22} className="text-gray-400" />
                          <div>
                            <div className="font-bold">Desktop Notifications</div>
                            <div className="text-sm text-gray-500">Receive alerts for new messages.</div>
                          </div>
                        </div>
                        <div className="w-12 h-6 bg-blue-600 rounded-full relative cursor-pointer"><div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div></div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-8 border-t border-gray-100 flex justify-end gap-4">
                  <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-all">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
