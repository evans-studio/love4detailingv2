import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  text?: string;
  fullPage?: boolean;
}

export function LoadingState({
  className,
  size = 'md',
  variant = 'primary',
  text,
  fullPage = false,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  const variantClasses = {
    primary: 'border-primary-600 border-t-transparent',
    secondary: 'border-gray-600 border-t-transparent',
    ghost: 'border-gray-300 border-t-transparent',
  };

  const spinnerClasses = cn(
    'animate-spin rounded-full',
    sizeClasses[size],
    variantClasses[variant],
    className
  );

  const content = (
    <div className={cn(
      'flex items-center justify-center gap-3',
      fullPage && 'min-h-screen'
    )}>
      <div className={spinnerClasses} />
      {text && (
        <span className={cn(
          'text-gray-600',
          size === 'sm' && 'text-sm',
          size === 'lg' && 'text-lg'
        )}>
          {text}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 z-50">
        {content}
      </div>
    );
  }

  return content;
}

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
  height?: string;
  width?: string;
}

export function LoadingSkeleton({
  className,
  count = 1,
  height = 'h-4',
  width = 'w-full',
}: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'animate-pulse bg-gray-200 rounded',
            height,
            width,
            className
          )}
        />
      ))}
    </>
  );
}

interface LoadingCardProps {
  className?: string;
  imageHeight?: string;
}

export function LoadingCard({ className, imageHeight = 'h-48' }: LoadingCardProps) {
  return (
    <div className={cn('rounded-lg border p-4 space-y-4', className)}>
      <LoadingSkeleton className={imageHeight} />
      <LoadingSkeleton height="h-6" width="w-3/4" />
      <LoadingSkeleton count={2} className="mt-2" />
      <LoadingSkeleton width="w-1/4" />
    </div>
  );
}

interface LoadingGridProps {
  count?: number;
  columns?: number;
  className?: string;
}

export function LoadingGrid({ count = 6, columns = 3, className }: LoadingGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        {
          'grid-cols-1': columns === 1,
          'grid-cols-2 md:grid-cols-2': columns === 2,
          'grid-cols-2 md:grid-cols-3': columns === 3,
          'grid-cols-2 md:grid-cols-4': columns === 4,
        },
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <LoadingCard key={index} />
      ))}
    </div>
  );
}

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingTable({ rows = 5, columns = 4, className }: LoadingTableProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: columns }).map((_, index) => (
          <LoadingSkeleton key={index} height="h-8" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton key={colIndex} height="h-6" />
          ))}
        </div>
      ))}
    </div>
  );
} 