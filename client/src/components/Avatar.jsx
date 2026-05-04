import { User } from 'lucide-react';
import { cn } from '../lib/utils';

const Avatar = ({ 
  src, 
  alt, 
  name,
  size = 'md',
  className 
}) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };
  
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-medium overflow-hidden',
      sizes[size],
      className
    )}>
      {src ? (
        <img src={src} alt={alt || name} className="w-full h-full object-cover" />
      ) : name ? (
        <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center">
          {getInitials(name)}
        </div>
      ) : (
        <div className="w-full h-full bg-gray-200 text-gray-500 flex items-center justify-center">
          <User className="w-1/2 h-1/2" />
        </div>
      )}
    </div>
  );
};

export default Avatar;
