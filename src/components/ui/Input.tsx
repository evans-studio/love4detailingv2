'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  helperText?: string;
  showRequiredIndicator?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, showRequiredIndicator = false, required, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-md border border-gray-700 bg-[#1A1A1A] px-3 py-2 text-sm text-[#F2F2F2] ring-offset-[#141414] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#8B8B8B] focus-visible:outline-none focus:ring-2 focus:ring-[#9146FF] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[#BA0C2F] focus-visible:ring-[#BA0C2F]',
            className
          )}
          ref={ref}
          required={required}
          {...props}
        />
        {(helperText || (showRequiredIndicator && required)) && (
          <p
            className={cn(
              'mt-1 text-sm',
              error ? 'text-[#BA0C2F]' : 'text-[#8B8B8B]'
            )}
          >
            {helperText || (required ? 'This field is required' : '')}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input }; 