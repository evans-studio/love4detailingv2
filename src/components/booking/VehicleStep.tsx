'use client';

import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

export function VehicleStep() {
  const { state, dispatch } = useBooking();

  const handleBack = () => {
    dispatch({ type: 'SET_STEP', payload: BookingStep.PersonalDetails });
  };

  const handleNext = () => {
    if (state.data.vehicleSize) {
      dispatch({ type: 'SET_STEP', payload: BookingStep.DateTime });
    }
  };

  if (!state.data.vehicleSize) {
    return (
      <Card className="p-6">
        <div className="text-red-500">Error: Vehicle size not determined</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Vehicle Size</h2>
          <p className="text-gray-600 mb-4">
            Based on your {state.data.vehicle?.make} {state.data.vehicle?.model}, your vehicle is classified as:
          </p>
        </div>

        <div className="p-6 bg-primary-50 rounded-lg border-2 border-primary-500">
          <div className="text-left">
            <h3 className="text-xl font-semibold">{state.data.vehicleSize.label}</h3>
            <p className="text-lg font-semibold text-primary-500 mt-2">
              {formatCurrency(state.data.vehicleSize.price_pence / 100)}
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button onClick={handleNext}>
            Continue
          </Button>
        </div>
      </div>
    </Card>
  );
} 