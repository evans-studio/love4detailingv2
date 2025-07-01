'use client';

import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { BookingStepper } from '@/components/booking/BookingStepper';
import { RegistrationStep } from '@/components/booking/RegistrationStep';
import { PersonalDetailsStep } from '@/components/booking/PersonalDetailsStep';
import { VehicleStep } from '@/components/booking/VehicleStep';
import { DateTimeStep } from '@/components/booking/DateTimeStep';
import { SummaryStep } from '@/components/booking/SummaryStep';

export default function BookingPage() {
  const { state } = useBooking();

  const renderStep = () => {
    switch (state.currentStep) {
      case BookingStep.Registration:
        return <RegistrationStep />;
      case BookingStep.PersonalDetails:
        return <PersonalDetailsStep />;
      case BookingStep.VehicleSize:
        return <VehicleStep />;
      case BookingStep.DateTime:
        return <DateTimeStep />;
      case BookingStep.Summary:
        return <SummaryStep />;
      default:
        return <RegistrationStep />;
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Book Your Detail</h1>
      <BookingStepper />
      <div className="max-w-2xl mx-auto">
        {renderStep()}
      </div>
    </main>
  );
} 