import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent",
  {
    variants: {
      variant: {
        default:
          "border-white/30 bg-primary/20 text-white hover:bg-primary/30 shadow-sm",
        secondary:
          "border-white/30 bg-white/15 text-white hover:bg-white/25 shadow-sm",
        destructive:
          "border-red-400/30 bg-red-500/20 text-red-100 hover:bg-red-500/30 shadow-sm",
        outline: "border-white/30 text-white/80 hover:bg-white/10 shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }