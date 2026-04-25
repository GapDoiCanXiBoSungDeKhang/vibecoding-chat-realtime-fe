import React from 'react';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', className = '' }) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl',
  };

  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <div className={`rounded-full flex items-center justify-center font-bold overflow-hidden flex-shrink-0 shadow-sm border border-black/5 ${sizeClasses[size]} ${className} ${!src ? 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700' : ''}`}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
};

export default Avatar;
