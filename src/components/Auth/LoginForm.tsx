import React, { useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface LoginFormProps {
  onToggleForm: () => void;
  onSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onToggleForm }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Vui lòng điền đầy đủ thông tin');
    
    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      login(response.accessToken, response.refreshToken);
      toast.success('Chào mừng bạn quay trở lại!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Email hoặc mật khẩu không đúng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Đăng nhập</h2>
        <p className="text-sm text-gray-500 mt-1">Chào mừng bạn quay trở lại với Zalo Hybrid.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Địa chỉ Email</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
              <Mail size={18} />
            </div>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all text-[14px]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Mật khẩu</label>
            <button type="button" className="text-[11px] font-bold text-blue-600 hover:underline">Quên mật khẩu?</button>
          </div>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
              <Lock size={18} />
            </div>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all text-[14px]"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] mt-4"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : (
            <>
              Tiếp tục <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-50 text-center">
        <p className="text-sm text-gray-500 font-medium">
          Bạn mới sử dụng Zalo Hybrid?{' '}
          <button 
            onClick={onToggleForm}
            className="text-blue-600 font-black hover:underline ml-1"
          >
            Tạo tài khoản
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;
