import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  className?: string;
}

export function Alert({ 
  children, 
  variant = 'default',
  className 
}: AlertProps) {
  const variantStyles = {
    default: 'bg-gray-100 text-gray-900',
    destructive: 'bg-red-50 text-red-900',
    warning: 'bg-yellow-50 text-yellow-900',
    success: 'bg-green-50 text-green-900'
  };

  return (
    <div className={cn(
      'rounded-lg p-4',
      variantStyles[variant],
      className
    )}>
      {children}
    </div>
  );
} 