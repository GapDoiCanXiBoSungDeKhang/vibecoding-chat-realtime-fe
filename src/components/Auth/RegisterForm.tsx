import React, { useState } from 'react';
import { Mail, Lock, User, Phone, Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

interface RegisterFormProps {
  onToggleForm: () => void;
  onSuccess: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleForm }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.register(formData);
      toast.success('Đăng ký thành công! Hãy đăng nhập.');
      onToggleForm();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <button onClick={onToggleForm} className="flex items-center gap-2 text-blue-600 font-bold text-xs mb-4 hover:bg-blue-50 px-3 py-1.5 rounded-full transition-colors w-fit">
           <ArrowLeft size={16} /> Quay lại
        </button>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Tạo tài khoản</h2>
        <p className="text-sm text-gray-500 mt-1">Tham gia cùng chúng tôi ngay hôm nay.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Họ và tên</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
              <User size={16} />
            </div>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Nguyễn Văn A"
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-blue-600 transition-all text-[13px]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
              <Mail size={16} />
            </div>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="example@gmail.com"
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-blue-600 transition-all text-[13px]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Số điện thoại</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
              <Phone size={16} />
            </div>
            <input 
              type="tel" 
              required
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              placeholder="0123 456 789"
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-blue-600 transition-all text-[13px]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Mật khẩu</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
              <Lock size={16} />
            </div>
            <input 
              type="password" 
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:bg-white focus:border-blue-600 transition-all text-[13px]"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] mt-4"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : (
            <>
              <UserPlus size={20} /> Đăng ký ngay
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
