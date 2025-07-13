import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 backdrop-blur-sm relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-primary/80 to-primary text-white border border-white/20 hover:from-primary hover:to-primary/90 hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]",
        destructive:
          "bg-gradient-to-r from-red-500/80 to-red-600/80 text-white border border-red-400/30 hover:from-red-500 hover:to-red-600 hover:shadow-lg hover:shadow-red-500/25 active:scale-[0.98]",
        outline:
          "border border-white/30 bg-white/10 text-white hover:bg-white/20 hover:backdrop-blur-md hover:shadow-lg active:scale-[0.98]",
        secondary:
          "bg-white/15 text-white border border-white/20 hover:bg-white/25 hover:backdrop-blur-md hover:shadow-lg active:scale-[0.98]",
        ghost: "text-white/80 hover:bg-white/15 hover:text-white hover:backdrop-blur-sm active:scale-[0.98]",
        link: "text-white/80 underline-offset-4 hover:underline hover:text-white",
      },
      size: {
        default: "h-10 md:h-11 px-4 py-2 min-h-[44px] md:min-h-[40px]",
        sm: "h-8 md:h-9 rounded-xl px-3 min-h-[36px] md:min-h-[32px]",
        lg: "h-12 md:h-13 rounded-xl px-6 md:px-8 min-h-[48px] text-base",
        icon: "h-10 w-10 md:h-11 md:w-11 min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }