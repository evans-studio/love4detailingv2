import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  variant?: 'default' | 'destructive' | 'warning' | 'success';
  className?: string;
}

interface AlertDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function Alert({ 
  children, 
  variant = 'default',
  className 
}: AlertProps) {
  const variantStyles = {
    default: 'bg-[#262626] text-[#F2F2F2] border border-gray-700',
    destructive: 'bg-[#BA0C2F]/10 text-[#F2F2F2] border border-[#BA0C2F]/30',
    warning: 'bg-yellow-500/10 text-[#F2F2F2] border border-yellow-500/30',
    success: 'bg-[#28C76F]/10 text-[#F2F2F2] border border-[#28C76F]/30'
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

export function AlertDescription({ 
  children, 
  className 
}: AlertDescriptionProps) {
  return (
    <div className={cn('text-sm', className)}>
      {children}
    </div>
  );
} 