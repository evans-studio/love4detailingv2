'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingState = React.forwardRef<HTMLDivElement, LoadingStateProps>(
  ({ className, children, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center space-x-2 text-gray-400',
          className
        )}
        {...props}
      >
        <Loader2 className={cn('animate-spin', sizeClasses[size])} />
        {children && <span className="text-sm">{children}</span>}
      </div>
    );
  }
);
LoadingState.displayName = 'LoadingState';

export { LoadingState };