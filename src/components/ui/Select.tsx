import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const selectVariants = cva(
  // Base styles
  'w-full rounded-lg border bg-white px-3 py-2 text-sm ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-purple disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-secondary-stone-grey',
        error: 'border-state-error focus-visible:ring-state-error',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    VariantProps<typeof selectVariants> {
  error?: string;
  label?: string;
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, label, options, variant, children, ...props }, ref) => {
    // If there's an error, override the variant
    const selectVariant = error ? 'error' : variant;

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-primary-black">
            {label}
          </label>
        )}
        <select
          className={selectVariants({ variant: selectVariant, className })}
          ref={ref}
          {...props}
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
          {children}
        </select>
        {error && (
          <p className="text-sm text-state-error">{error}</p>
        )}
      </div>
    );
  }
); 