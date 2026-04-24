import React, { useState } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';

interface LoginFormProps {
  onToggleForm: () => void;
  onSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onToggleForm, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await authService.login({ email, password });
      toast.success('Login successful! Welcome back.');
      setIsLoading(false);
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(message);
      toast.error(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h1>Welcome Back</h1>
        <p>We're so excited to see you again!</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div style={{ color: '#ff4444', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        
        <div className="form-group">
          <label className="form-label">Email</label>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
            />
            <Mail size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <Lock size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <button 
          type="submit" 
          className={`auth-button ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin" style={{ margin: '0 auto' }} /> : 'Log In'}
        </button>
      </form>

      <div className="auth-footer">
        Need an account? <a href="#" className="auth-link" onClick={(e) => { e.preventDefault(); onToggleForm(); }}>Register</a>
      </div>
    </div>
  );
};

export default LoginForm;
