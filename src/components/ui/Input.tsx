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
            'flex h-10 w-full rounded-md border border-stone bg-transparent px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted focus-visible:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-error focus-visible:ring-error',
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
              error ? 'text-error' : 'text-muted'
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