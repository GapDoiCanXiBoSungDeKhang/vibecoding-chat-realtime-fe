import React, { useState } from 'react';
import LoginForm from '../components/Auth/LoginForm';
import RegisterForm from '../components/Auth/RegisterForm';
import { motion, AnimatePresence } from 'framer-motion';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  const handleToggle = () => setIsLogin(!isLogin);
  const handleSuccess = () => {
    // State is handled by AuthContext globally
  };

  return (
    <div className="auth-container">
      {/* Background elements for extra flair */}
      <div style={{
        position: 'absolute',
        top: '20%',
        right: '15%',
        width: '500px',
        height: '500px',
        background: 'var(--accent-blue)',
        filter: 'blur(180px)',
        opacity: 0.08,
        borderRadius: '50%',
        zIndex: -1,
      }} />

      <AnimatePresence mode="wait">
        <motion.div
          key={isLogin ? 'login' : 'register'}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {isLogin ? (
            <LoginForm onToggleForm={handleToggle} onSuccess={handleSuccess} />
          ) : (
            <RegisterForm onToggleForm={handleToggle} onSuccess={handleSuccess} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AuthPage;
