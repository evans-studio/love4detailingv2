'use client';

import { useBooking, BookingStep, isStepComplete } from '@/lib/context/BookingContext';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import type { Database } from '@/types/supabase';

type Vehicle = Database['public']['Tables']['vehicles']['Row'] & {
  vehicle_sizes: {
    id: string;
    label: string;
    description: string | null;
    price_pence: number;
  } | null;
};

interface BookingStepperProps {
  userVehicles?: Vehicle[];
}

// Define steps for authenticated and unauthenticated users
const authenticatedSteps = [
  { key: BookingStep.VehicleSize, label: 'Vehicle' },
  { key: BookingStep.DateTime, label: 'Date & Time' },
  { key: BookingStep.Summary, label: 'Summary' },
];

const unauthenticatedSteps = [
  { key: BookingStep.Registration, label: 'Vehicle' },
  { key: BookingStep.PersonalDetails, label: 'Details' },
  { key: BookingStep.VehicleSize, label: 'Size' },
  { key: BookingStep.DateTime, label: 'Date & Time' },
  { key: BookingStep.Summary, label: 'Summary' },
];

// Separate client-only SVG component
function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6 text-white"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// Separate step button component to handle client-side rendering
function StepButton({ 
  step, 
  isCompleted, 
  isCurrent, 
  stepNumber, 
  onClick 
}: { 
  step: { key: BookingStep; label: string }; 
  isCompleted: boolean; 
  isCurrent: boolean; 
  stepNumber: number;
  onClick: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with the same dimensions during SSR
    return (
      <div className="flex items-center px-6 py-4 text-sm font-medium">
        <div className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          isCompleted ? 'bg-primary-600' : isCurrent ? 'border-2 border-primary-600 bg-white' : 'border-2 border-gray-300 bg-white'
        )}>
          {/* Placeholder for icon/number */}
          <span className="opacity-0">{stepNumber}</span>
        </div>
        <span className={cn(
          'ml-4 text-sm font-medium',
          isCurrent ? 'text-primary-600' : 'text-gray-500'
        )}>
          {step.label}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center"
      disabled={!isCompleted && !isCurrent}
    >
      <span className="flex items-center px-6 py-4 text-sm font-medium">
        <span className={cn(
          'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
          isCompleted ? 'bg-primary-600' : isCurrent ? 'border-2 border-primary-600 bg-white' : 'border-2 border-gray-300 bg-white'
        )}>
          {isCompleted ? <CheckIcon /> : stepNumber}
        </span>
        <span className={cn(
          'ml-4 text-sm font-medium',
          isCurrent ? 'text-primary-600' : 'text-gray-500'
        )}>
          {step.label}
        </span>
      </span>
    </button>
  );
}

export function BookingStepper({ userVehicles = [] }: BookingStepperProps) {
  const { state, dispatch } = useBooking();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use the appropriate steps based on authentication status
  const steps = state.authStatus.isAuthenticated ? authenticatedSteps : unauthenticatedSteps;

  // If authenticated, ensure we start at the VehicleSize step
  useEffect(() => {
    if (state.authStatus.isAuthenticated && state.currentStep === BookingStep.Registration) {
      dispatch({ type: 'SET_STEP', payload: BookingStep.VehicleSize });
    }
  }, [state.authStatus.isAuthenticated, state.currentStep, dispatch]);

  const handleStepClick = (step: BookingStep) => {
    const stepIndex = steps.findIndex(s => s.key === step);
    const currentIndex = steps.findIndex(s => s.key === state.currentStep);
    const isCompleted = steps.slice(0, stepIndex).every(s => isStepComplete(s.key, state.data, state.authStatus.isAuthenticated));
    
    if (stepIndex <= currentIndex || isCompleted) {
      dispatch({ type: 'SET_STEP', payload: step });
    }
  };


  // During SSR and initial mount, render a simplified version
  if (!mounted) {
    return (
      <nav aria-label="Progress" className="mb-8">
        <ol role="list" className="flex items-center justify-between">
          {steps.map((step, stepIdx) => (
            <li
              key={step.key}
              className={cn(
                stepIdx !== steps.length - 1 ? 'flex-1' : '',
                'relative'
              )}
            >
              <div className="flex items-center px-6 py-4 text-sm font-medium">
                <div className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-gray-300 bg-white" />
                <span className="ml-4 text-sm font-medium text-gray-500">
                  {step.label}
                </span>
              </div>
              {stepIdx !== steps.length - 1 && (
                <div
                  className="absolute right-0 top-0 hidden h-full w-1 bg-gray-300 md:block"
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol role="list" className="flex items-center justify-between">
        {steps.map((step, stepIdx) => {
          const isCurrent = state.currentStep === step.key;
          const isCompleted = isStepComplete(step.key, state.data, state.authStatus.isAuthenticated);
          const stepNumber = stepIdx + 1;

          return (
            <li
              key={step.key}
              className={cn(
                stepIdx !== steps.length - 1 ? 'flex-1' : '',
                'relative'
              )}
            >
              <StepButton
                step={step}
                isCompleted={isCompleted}
                isCurrent={isCurrent}
                stepNumber={stepNumber}
                onClick={() => handleStepClick(step.key)}
              />
              {stepIdx !== steps.length - 1 && (
                <div
                  className={cn(
                    isCompleted ? 'bg-primary-600' : 'bg-gray-300',
                    'absolute right-0 top-0 hidden h-full w-1 md:block'
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