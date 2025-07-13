import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { 
  AlertCircle, 
  CheckCircle, 
  Info, 
  AlertTriangle, 
  X,
  type LucideIcon 
} from "lucide-react"

const alertVariants = cva(
  // Base styles for Love4Detailing dark theme
  "relative w-full rounded-lg border-l-4 p-4 [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        // Information alerts - Purple brand accent
        default: [
          "bg-[#262626] text-[#F8F4EB] border-l-[#9747FF]",
          "[&>svg]:text-[#9747FF]"
        ],
        // Success alerts - Green accent with dark theme
        success: [
          "bg-[#262626] text-[#F8F4EB] border-l-[#28C76F]",
          "[&>svg]:text-[#28C76F]"
        ],
        // Warning alerts - Orange accent  
        warning: [
          "bg-[#262626] text-[#F8F4EB] border-l-[#FFA726]",
          "[&>svg]:text-[#FFA726]"
        ],
        // Error alerts - Red accent
        destructive: [
          "bg-[#262626] text-[#F8F4EB] border-l-[#BA0C2F]",
          "[&>svg]:text-[#BA0C2F]"
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & 
  VariantProps<typeof alertVariants> & {
    dismissible?: boolean
    onDismiss?: () => void
  }
>(({ className, variant, dismissible, onDismiss, children, ...props }, ref) => {
  const [isVisible, setIsVisible] = React.useState(true)

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </div>
  )
})
Alert.displayName = "Alert"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

// Icon mapping for different alert types
const getAlertIcon = (variant: VariantProps<typeof alertVariants>["variant"]) => {
  switch (variant) {
    case "success":
      return CheckCircle
    case "warning":
      return AlertTriangle
    case "destructive":
      return AlertCircle
    default:
      return Info
  }
}

// Pre-configured alert components for common use cases
interface BrandedAlertProps {
  title?: string
  children: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

export const InfoAlert = ({ title, children, dismissible, onDismiss, className }: BrandedAlertProps) => {
  const Icon = getAlertIcon("default")
  return (
    <Alert variant="default" dismissible={dismissible} onDismiss={onDismiss} className={className}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export const SuccessAlert = ({ title, children, dismissible, onDismiss, className }: BrandedAlertProps) => {
  const Icon = getAlertIcon("success")
  return (
    <Alert variant="success" dismissible={dismissible} onDismiss={onDismiss} className={className}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export const WarningAlert = ({ title, children, dismissible, onDismiss, className }: BrandedAlertProps) => {
  const Icon = getAlertIcon("warning")
  return (
    <Alert variant="warning" dismissible={dismissible} onDismiss={onDismiss} className={className}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export const ErrorAlert = ({ title, children, dismissible, onDismiss, className }: BrandedAlertProps) => {
  const Icon = getAlertIcon("destructive")
  return (
    <Alert variant="destructive" dismissible={dismissible} onDismiss={onDismiss} className={className}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}

export { Alert, AlertTitle, AlertDescription, alertVariants }