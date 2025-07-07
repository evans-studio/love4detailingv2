'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[#9747FF] text-white shadow hover:bg-[#8442E6]',
        secondary:
          'border-transparent bg-gray-700 text-gray-100 hover:bg-gray-600',
        destructive:
          'border-transparent bg-red-500 text-white shadow hover:bg-red-600',
        outline: 'text-gray-300 border-gray-600',
        success:
          'border-transparent bg-green-500 text-white shadow hover:bg-green-600',
        warning:
          'border-transparent bg-yellow-500 text-black shadow hover:bg-yellow-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };