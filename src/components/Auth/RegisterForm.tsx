import React, { useState } from 'react';
import { Mail, Lock, User, Phone, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

interface RegisterFormProps {
  onToggleForm: () => void;
  onSuccess: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleForm, onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.passwordConfirm) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await authService.register(formData);
      toast.success('Registration successful! You can now log in.');
      setIsLoading(false);
      onSuccess();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Registration failed. Please check your details.';
      setError(message);
      toast.error(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card" style={{ maxWidth: '500px' }}>
      <div className="auth-header">
        <h1>Create an account</h1>
        <p>Join our community today</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <div style={{ color: '#ff4444', fontSize: '13px', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input
              name="firstName"
              className="form-input"
              value={formData.firstName}
              onChange={handleChange}
              required
              placeholder="John"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input
              name="lastName"
              className="form-input"
              value={formData.lastName}
              onChange={handleChange}
              required
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <div style={{ position: 'relative' }}>
            <input
              name="email"
              type="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="john@example.com"
            />
            <Mail size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <div style={{ position: 'relative' }}>
            <input
              name="phoneNumber"
              type="tel"
              className="form-input"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              placeholder="0123456789"
            />
            <Phone size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              name="password"
              type="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
            />
            <Lock size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <input
              name="passwordConfirm"
              type="password"
              className="form-input"
              value={formData.passwordConfirm}
              onChange={handleChange}
              required
              placeholder="••••••••"
            />
            <Lock size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>
        </div>

        <button 
          type="submit" 
          className={`auth-button ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="animate-spin" style={{ margin: '0 auto' }} /> : 'Continue'}
        </button>
      </form>

      <div className="auth-footer">
        Already have an account? <a href="#" className="auth-link" onClick={(e) => { e.preventDefault(); onToggleForm(); }}>Log In</a>
      </div>
    </div>
  );
};

export default RegisterForm;
