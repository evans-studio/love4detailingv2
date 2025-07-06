import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export function Badge({ 
  children, 
  className,
  variant = 'default'
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  
  const variantClasses = {
    default: 'bg-[#9146FF]/20 text-[#F2F2F2] border border-[#9146FF]/30',
    secondary: 'bg-[#262626] text-[#C7C7C7] border border-gray-700',
    destructive: 'bg-[#BA0C2F]/20 text-[#F2F2F2] border border-[#BA0C2F]/30',
    outline: 'border border-gray-700 text-[#F2F2F2] bg-transparent',
  };

  return (
    <span 
      className={cn(
        baseClasses,
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}