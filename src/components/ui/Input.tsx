import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 md:h-11 w-full rounded-xl border border-white/30 bg-white/10 backdrop-blur-sm px-4 py-2 text-sm md:text-base text-white placeholder:text-white/50 transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:border-white/50 focus-visible:bg-white/15",
          "hover:bg-white/15 hover:border-white/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[44px] md:min-h-[40px]", // Touch-friendly mobile sizing
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }