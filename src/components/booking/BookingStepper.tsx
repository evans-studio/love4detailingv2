import { useBooking, BookingStep, isStepComplete } from '@/lib/context/BookingContext';
import { CheckIcon } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

const steps = [
  { key: BookingStep.Registration, label: 'Vehicle' },
  { key: BookingStep.PersonalDetails, label: 'Details' },
  { key: BookingStep.VehicleSize, label: 'Size' },
  { key: BookingStep.DateTime, label: 'Date & Time' },
  { key: BookingStep.Summary, label: 'Summary' },
];

export function BookingStepper() {
  const { state, dispatch } = useBooking();

  const handleStepClick = (step: BookingStep) => {
    // Only allow clicking on completed steps or the next incomplete step
    const stepIndex = steps.findIndex(s => s.key === step);
    const currentIndex = steps.findIndex(s => s.key === state.currentStep);
    const isCompleted = steps.slice(0, stepIndex).every(s => isStepComplete(s.key, state.data));
    
    if (stepIndex <= currentIndex || isCompleted) {
      dispatch({ type: 'SET_STEP', payload: step });
    }
  };

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, stepIdx) => {
          const isActive = state.currentStep === step.key;
          const isCompleted = isStepComplete(step.key, state.data);
          const stepNumber = stepIdx + 1;

          return (
            <li
              key={step.key}
              className={cn(
                stepIdx !== steps.length - 1 ? 'w-full' : '',
                'relative'
              )}
            >
              {isCompleted ? (
                <div className="group flex items-center">
                  <span className="flex items-center">
                    <button
                      onClick={() => handleStepClick(step.key)}
                      className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 hover:bg-primary-700"
                    >
                      <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                    </button>
                  </span>
                  <span className="absolute -bottom-[1.75rem] w-32 text-sm font-medium text-primary-500">
                    {step.label}
                  </span>
                </div>
              ) : (
                <div className="group flex items-center">
                  <span className="flex items-center">
                    <button
                      onClick={() => handleStepClick(step.key)}
                      className={cn(
                        'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2',
                        isActive
                          ? 'border-primary-500 bg-white'
                          : 'border-gray-300 bg-white hover:border-gray-400',
                      )}
                    >
                      <span
                        className={cn(
                          'h-2.5 w-2.5 rounded-full',
                          isActive ? 'bg-primary-500' : 'bg-transparent'
                        )}
                      />
                    </button>
                  </span>
                  <span
                    className={cn(
                      'absolute -bottom-[1.75rem] w-32 text-sm font-medium',
                      isActive ? 'text-primary-500' : 'text-gray-500'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              )}

              {stepIdx !== steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-20 top-4 -ml-px h-0.5 w-full',
                    isCompleted ? 'bg-primary-500' : 'bg-gray-300'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
} 