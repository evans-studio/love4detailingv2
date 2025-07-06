'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { unifiedBookingSchema, type UnifiedBookingForm } from '@/lib/validation/booking';
// ServiceSelectionStep removed - Single Full Valet service only
import { VehicleInfoStep } from './steps/VehicleInfoStep';
import { PersonalDetailsStep } from './steps/PersonalDetailsStep';
import { DateTimeStep } from './steps/DateTimeStep';
import { SummaryStep } from './steps/SummaryStep';
import { LoadingState } from '@/components/ui/LoadingState';

interface VehicleSize {
  id: string;
  label: string;
  description: string;
  price_pence: number;
}

interface UnifiedBookingFormProps {
  className?: string;
}

const steps = [
  { id: 1, title: 'Vehicle Details', description: 'Tell us about your vehicle' },
  { id: 2, title: 'Date & Time', description: 'Choose your appointment' },
  { id: 3, title: 'Contact Info', description: 'Your contact information' },
  { id: 4, title: 'Payment/Confirmation', description: 'Review and confirm' },
];

export function UnifiedBookingForm({ className = '' }: UnifiedBookingFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [vehicleSizes, setVehicleSizes] = useState<VehicleSize[]>([]);
  const [isLoadingVehicleSizes, setIsLoadingVehicleSizes] = useState(true);

  const methods = useForm<UnifiedBookingForm>({
    resolver: zodResolver(unifiedBookingSchema),
    defaultValues: {
      currentStep: 1,
      service: {
        serviceId: 'full_valet',
        serviceName: 'Full Valet',
      },
      vehicle: {
        make: '',
        model: '',
        registration: '',
        year: '',
        color: '',
        sizeId: '',
        size: '',
      },
      personalDetails: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        postcode: '',
        photos: [],
      },
      dateTime: {
        timeSlotId: '',
        date: '',
        time: '',
      },
      distanceWarning: false,
    },
    mode: 'onChange',
  });

  // Load vehicle sizes on mount
  useEffect(() => {
    loadVehicleSizes();
  }, []);

  // Update form current step when state changes
  useEffect(() => {
    methods.setValue('currentStep', currentStep);
  }, [currentStep, methods]);

  const loadVehicleSizes = async () => {
    try {
      const response = await fetch('/api/vehicle-sizes');
      if (response.ok) {
        const sizes: VehicleSize[] = await response.json();
        setVehicleSizes(sizes);
      }
    } catch (error) {
      console.error('Error loading vehicle sizes:', error);
    } finally {
      setIsLoadingVehicleSizes(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= steps.length) {
      setCurrentStep(step);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <VehicleInfoStep 
            onNext={nextStep}
            vehicleSizes={vehicleSizes}
          />
        );
      case 2:
        return (
          <DateTimeStep 
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <PersonalDetailsStep 
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <SummaryStep 
            onBack={prevStep}
            vehicleSizes={vehicleSizes}
          />
        );
      default:
        return null;
    }
  };

  if (isLoadingVehicleSizes) {
    return (
      <div className="flex justify-center py-8">
        <LoadingState>Loading booking form...</LoadingState>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 ${index !== steps.length - 1 ? 'pr-4' : ''}`}
            >
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step.id === currentStep
                      ? 'bg-[#9146FF] text-white'
                      : step.id < currentStep
                      ? 'bg-[#9146FF]/20 text-[#9146FF] hover:bg-[#9146FF]/30'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step.id < currentStep ? '✓' : step.id}
                </button>
                <div className="ml-3 flex-1">
                  <div
                    className={`text-sm font-medium ${
                      step.id === currentStep
                        ? 'text-[#9146FF]'
                        : step.id < currentStep
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {step.description}
                  </div>
                </div>
              </div>
              {index !== steps.length - 1 && (
                <div
                  className={`mt-5 h-0.5 ${
                    step.id < currentStep ? 'bg-[#9146FF]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <FormProvider {...methods}>
        <form className={`shadow-lg rounded-lg p-6 md:p-8 ${
          currentStep === 1 ? 'bg-[#141414]' : 'bg-white'
        }`}>
          {renderStep()}
        </form>
      </FormProvider>
    </div>
  );
}