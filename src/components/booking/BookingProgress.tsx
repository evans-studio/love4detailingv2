'use client'

interface BookingProgressProps {
  currentStep: number
  totalSteps: number
}

const stepLabels = [
  'Vehicle Details',
  'Date & Time', 
  'Contact Details',
  'Payment & Confirmation'
]

export function BookingProgress({ currentStep, totalSteps }: BookingProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep
          const isCompleted = stepNumber < currentStep
          const isAccessible = stepNumber <= currentStep

          return (
            <div
              key={stepNumber}
              className={`flex-1 ${index !== totalSteps - 1 ? 'pr-4' : ''}`}
            >
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#9146FF] text-white'
                      : isCompleted
                      ? 'bg-[#9146FF]/20 text-[#9146FF]'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <div
                    className={`text-sm font-medium ${
                      isActive
                        ? 'text-[#9146FF]'
                        : isCompleted
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {stepLabels[index]}
                  </div>
                </div>
              </div>
              {index !== totalSteps - 1 && (
                <div className="mt-5 flex">
                  <div
                    className={`h-0.5 flex-1 ${
                      isCompleted ? 'bg-[#9146FF]' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}