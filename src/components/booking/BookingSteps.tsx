'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { 
  Car,
  Clock,
  User,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Star,
  Calendar,
  CreditCard,
  AlertCircle,
  Info,
  Timer,
  MapPin,
  Phone,
  Mail,
  Loader2
} from 'lucide-react'

interface Step {
  id: number
  name: string
  shortName: string
  description: string
  icon: React.ComponentType<any>
  isRequired: boolean
  estimatedTime: string
}

interface BookingStepsProps {
  currentStep: number
  onStepChange: (step: number) => void
  canProceedToStep: (step: number) => boolean
  isLoading?: boolean
  stepValidation?: {
    [key: number]: {
      isValid: boolean
      errors: string[]
      warnings: string[]
    }
  }
  completionStatus?: {
    [key: number]: {
      isComplete: boolean
      completionTime?: string
      data?: any
    }
  }
  showProgress?: boolean
  showEstimatedTime?: boolean
  allowSkipping?: boolean
  compactMode?: boolean
}

// Enhanced step definitions for Step 1 - Static UI
const STEPS: Step[] = [
  {
    id: 1,
    name: 'Service Selection',
    shortName: 'Service',
    description: 'Choose your detailing service and add-ons',
    icon: Star,
    isRequired: true,
    estimatedTime: '2-3 min'
  },
  {
    id: 2,
    name: 'Vehicle Selection',
    shortName: 'Vehicle',
    description: 'Select or add your vehicle details',
    icon: Car,
    isRequired: true,
    estimatedTime: '1-2 min'
  },
  {
    id: 3,
    name: 'Date & Time',
    shortName: 'Schedule',
    description: 'Pick your preferred appointment slot',
    icon: Calendar,
    isRequired: true,
    estimatedTime: '2-3 min'
  },
  {
    id: 4,
    name: 'Your Details',
    shortName: 'Details',
    description: 'Provide contact information',
    icon: User,
    isRequired: true,
    estimatedTime: '1-2 min'
  },
  {
    id: 5,
    name: 'Review & Confirm',
    shortName: 'Review',
    description: 'Review and confirm your booking',
    icon: CheckCircle,
    isRequired: true,
    estimatedTime: '1 min'
  }
]

export function BookingSteps({ 
  currentStep, 
  onStepChange, 
  canProceedToStep, 
  isLoading = false,
  stepValidation = {},
  completionStatus = {},
  showProgress = true,
  showEstimatedTime = true,
  allowSkipping = false,
  compactMode = false
}: BookingStepsProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null)
  
  const getStepStatus = (step: Step) => {
    const isActive = currentStep === step.id
    const isCompleted = completionStatus[step.id]?.isComplete || currentStep > step.id
    const canAccess = canProceedToStep(step.id) || isCompleted
    const hasErrors = stepValidation[step.id]?.errors?.length > 0
    const hasWarnings = stepValidation[step.id]?.warnings?.length > 0
    
    return {
      isActive,
      isCompleted,
      canAccess,
      hasErrors,
      hasWarnings,
      validation: stepValidation[step.id]
    }
  }

  const getProgressPercentage = () => {
    const completedSteps = STEPS.filter(step => 
      completionStatus[step.id]?.isComplete || currentStep > step.id
    ).length
    return Math.round((completedSteps / STEPS.length) * 100)
  }

  const getTotalEstimatedTime = () => {
    const remainingSteps = STEPS.filter(step => currentStep <= step.id)
    return remainingSteps.reduce((total, step) => {
      const timeRange = step.estimatedTime.split('-')
      const avgTime = timeRange.length > 1 
        ? (parseInt(timeRange[0]) + parseInt(timeRange[1])) / 2
        : parseInt(timeRange[0])
      return total + avgTime
    }, 0)
  }

  const handleStepClick = (stepId: number) => {
    const stepStatus = getStepStatus(STEPS.find(s => s.id === stepId)!)
    
    if (stepStatus.canAccess || allowSkipping) {
      onStepChange(stepId)
    }
  }

  const handlePrevious = () => {
    const prevStep = Math.max(1, currentStep - 1)
    onStepChange(prevStep)
  }

  const handleNext = () => {
    const nextStep = Math.min(STEPS.length, currentStep + 1)
    if (canProceedToStep(nextStep)) {
      onStepChange(nextStep)
    }
  }

  if (compactMode) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Step {currentStep} of {STEPS.length}</span>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                {STEPS.find(s => s.id === currentStep)?.shortName}
              </Badge>
            </div>
            {showEstimatedTime && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Timer className="h-3 w-3" />
                ~{getTotalEstimatedTime()} min left
              </div>
            )}
          </div>
          
          {showProgress && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mb-8">
      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Booking Progress
            </span>
            <span className="text-sm text-gray-500">
              {getProgressPercentage()}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      )}

      {/* Estimated Time Remaining */}
      {showEstimatedTime && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <Timer className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-800">
            <strong>Estimated time remaining:</strong> {getTotalEstimatedTime()} minutes
          </AlertDescription>
        </Alert>
      )}

      {/* Step Navigation */}
      <div className="flex items-center justify-between relative">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step)
          const Icon = step.icon
          
          return (
            <div key={step.id} className="flex items-center relative">
              {/* Step Circle */}
              <div 
                className={`
                  relative flex items-center justify-center w-12 h-12 rounded-full border-2 cursor-pointer
                  transition-all duration-200 transform hover:scale-105
                  ${status.isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : status.isActive
                    ? 'bg-purple-500 border-purple-500 text-white'
                    : status.canAccess
                    ? 'bg-white/20 border-purple-400/50 text-purple-300 hover:border-purple-400'
                    : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                  }
                  ${status.hasErrors ? 'ring-2 ring-red-500' : ''}
                  ${status.hasWarnings ? 'ring-2 ring-amber-500' : ''}
                `}
                onClick={() => handleStepClick(step.id)}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                {isLoading && status.isActive ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : status.isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : status.hasErrors ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>

              {/* Step Label */}
              <div className={`
                absolute top-14 left-1/2 transform -translate-x-1/2 text-center min-w-max
                ${status.isActive ? 'text-purple-600 font-medium' : 'text-gray-600'}
              `}>
                <div className="text-sm font-medium">{step.shortName}</div>
                {showEstimatedTime && (
                  <div className="text-xs text-gray-500 mt-1">{step.estimatedTime}</div>
                )}
              </div>

              {/* Hover Tooltip */}
              {hoveredStep === step.id && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-10 bg-black text-white text-xs rounded py-2 px-3 min-w-max mt-2">
                  <div className="font-medium">{step.name}</div>
                  <div className="text-gray-300">{step.description}</div>
                  {status.validation && (
                    <div className="mt-1 space-y-1">
                      {status.validation.errors.map((error, i) => (
                        <div key={i} className="text-red-300 text-xs">• {error}</div>
                      ))}
                      {status.validation.warnings.map((warning, i) => (
                        <div key={i} className="text-amber-300 text-xs">• {warning}</div>
                      ))}
                    </div>
                  )}
                  {/* Tooltip Arrow */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black"></div>
                </div>
              )}

              {/* Connection Line */}
              {index < STEPS.length - 1 && (
                <div className={`
                  w-16 h-px mx-4 transition-all duration-200
                  ${status.isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                `} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Validation Messages */}
      {stepValidation[currentStep] && (
        <div className="mt-4 space-y-2">
          {stepValidation[currentStep].errors.map((error, index) => (
            <Alert key={index} className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          ))}
          {stepValidation[currentStep].warnings.map((warning, index) => (
            <Alert key={index} className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1 || isLoading}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-4">
          {/* Skip Button (if allowed) */}
          {allowSkipping && currentStep < STEPS.length && (
            <Button
              variant="ghost"
              onClick={handleNext}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </Button>
          )}

          {/* Next/Finish Button */}
          <Button
            onClick={handleNext}
            disabled={!canProceedToStep(currentStep + 1) || isLoading}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : currentStep === STEPS.length ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Complete Booking
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Current Step Information */}
      <Card className="mt-4 bg-purple-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Info className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-purple-800">
                {STEPS.find(s => s.id === currentStep)?.name}
              </div>
              <div className="text-sm text-purple-600 mt-1">
                {STEPS.find(s => s.id === currentStep)?.description}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Export step definitions for use in other components
export { STEPS }
export type { Step }