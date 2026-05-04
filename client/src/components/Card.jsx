import { cn } from '../lib/utils';

const Card = ({ children, className, padding = true, hover = false }) => {
  return (
    <div className={cn(
      'bg-white rounded-lg shadow-sm border border-gray-200',
      padding && 'p-6',
      hover && 'hover:shadow-md transition-shadow cursor-pointer',
      className
    )}>
      {children}
    </div>
  );
};

export default Card;
