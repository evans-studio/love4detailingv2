'use client';

import { useEffect, useState } from 'react';
import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ComboBox } from '@/components/ui/comboBox';
import { AutocompleteInput } from '@/components/ui/autocompleteInput';
import { formatCurrency } from '@/lib/utils';
import type { VehicleSize } from '@/types/database.types';
// Vehicle size calculation removed - now handled by service pricing
import { LoadingState } from '@/components/ui/loadingState';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { getUniqueMakes, getModelsForMake } from '@/lib/utils/vehicle-data';
import type { Database } from '@/types/supabase';

type Vehicle = Database['public']['Tables']['vehicles']['Row'] & {
  vehicle_sizes: {
    id: string;
    label: string;
    description: string | null;
    price_pence: number;
  } | null;
};

interface VehicleStepProps {
  userVehicles?: Vehicle[];
}

export default function VehicleStep({ userVehicles = [] }: VehicleStepProps) {
  const { state, dispatch } = useBooking();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [makes, setMakes] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>(state.data.vehicle?.make || '');
  const [modelInput, setModelInput] = useState<string>(state.data.vehicle?.model || '');
  const [modelSuggestions, setModelSuggestions] = useState<Array<{ model: string; trim: string }>>([]);

  // Don't show this component in dashboard mode
  if (state.bookingType === 'dashboard') {
    return null;
  }

  // Load makes on mount
  useEffect(() => {
    setMakes(getUniqueMakes());
  }, []);

  // Update model suggestions when make changes
  useEffect(() => {
    if (selectedMake) {
      const models = getModelsForMake(selectedMake);
      setModelSuggestions(models.map(model => ({ model, trim: '' })));
    }
  }, [selectedMake]);

  useEffect(() => {
    const determineSize = async () => {
      if (!state.data.vehicle?.make || !state.data.vehicle?.model) {
        setLoading(false);
        return;
      }

      // Auto-detection removed - defaulting to medium size
      dispatch({
        type: 'SET_VEHICLE_SIZE',
        payload: {
          id: 'medium',
          label: 'Medium',
          description: 'Medium sized vehicle',
          price_pence: 4500 // Default medium price
        }
      });
      setError(null);
    };

    // Only determine size if we have vehicle details and no size is set
    if (state.data.vehicle?.make && state.data.vehicle?.model && !state.data.vehicleSize) {
      determineSize();
    }
  }, [state.data.vehicle, dispatch]);

  const handleVehicleSelect = (vehicleId: string) => {
    const vehicle = userVehicles.find(v => v.id === vehicleId);
    if (vehicle && vehicle.vehicle_sizes) {
      setSelectedVehicle(vehicleId);
      
      // Set vehicle details
      dispatch({
        type: 'SET_VEHICLE_DETAILS',
        payload: {
          registration: vehicle.registration,
          make: vehicle.make || '',
          model: vehicle.model || '',
          year: vehicle.year || undefined,
          color: vehicle.color || '',
        }
      });

      // Set vehicle size directly from the joined data
      dispatch({
        type: 'SET_VEHICLE_SIZE',
        payload: {
          id: vehicle.vehicle_sizes.id as VehicleSize,
          label: vehicle.vehicle_sizes.label,
          description: vehicle.vehicle_sizes.description || '',
          price_pence: vehicle.vehicle_sizes.price_pence
        }
      });
    }
  };

  const handleMakeChange = (value: string) => {
    setSelectedMake(value);
    dispatch({
      type: 'SET_VEHICLE_DETAILS',
      payload: {
        make: value,
        model: '',
        registration: state.data.vehicle?.registration || '',
        year: undefined,
        color: ''
      }
    });
  };

  const handleModelSelect = (model: string) => {
    setModelInput(model);
    if (state.data.vehicle) {
      dispatch({
        type: 'SET_VEHICLE_DETAILS',
        payload: {
          ...state.data.vehicle,
          model
        }
      });
    }
  };

  const handleNext = () => {
    if (state.data.vehicleSize) {
      // For authenticated users, go to DateTime step
      // For unauthenticated users, go to PersonalDetails step
      const nextStep = state.authStatus.isAuthenticated 
        ? BookingStep.DateTime 
        : BookingStep.PersonalDetails;
      dispatch({ type: 'SET_STEP', payload: nextStep });
    }
  };

  if (loading) {
    return <LoadingState>Determining vehicle size...</LoadingState>;
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Vehicle Selection</h2>
          {false && userVehicles.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a saved vehicle
              </label>
              <Select value={selectedVehicle || ''} onValueChange={handleVehicleSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  {userVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} ({vehicle.registration})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVehicle && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setSelectedVehicle(null);
                    dispatch({
                      type: 'SET_VEHICLE_DETAILS',
                      payload: null
                    });
                    dispatch({
                      type: 'SET_VEHICLE_SIZE',
                      payload: null
                    });
                  }}
                >
                  Enter Different Vehicle
                </Button>
              )}
            </div>
          )}

          {(state.bookingType === 'public' || (state.bookingType === 'dashboard' && userVehicles.length === 0) || !selectedVehicle) && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Make
                </label>
                <ComboBox
                  value={selectedMake}
                  onValueChange={handleMakeChange}
                  placeholder="Select Make"
                  options={makes.map(make => ({ label: make, value: make }))}
                />
              </div>

              {selectedMake && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <AutocompleteInput
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    onSuggestionSelect={handleModelSelect}
                    suggestions={modelSuggestions.map(m => `${m.model} ${m.trim}`)}
                    placeholder="Start typing to find your model"
                    required={true}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration (optional)
                </label>
                <Input
                  type="text"
                  placeholder="Enter registration"
                  value={state.data.vehicle?.registration || ''}
                  onChange={(e) => {
                    const registration = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (state.data.vehicle) {
                      dispatch({
                        type: 'SET_VEHICLE_DETAILS',
                        payload: { ...state.data.vehicle, registration }
                      });
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {error ? (
          <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>
        ) : state.data.vehicleSize ? (
          <div>
            <p className="text-gray-600 mb-4">
              Based on your vehicle details, we have determined the following size category:
            </p>
        <div className="p-6 bg-primary-50 rounded-lg border-2 border-primary-500">
          <div className="text-left">
            <h3 className="text-xl font-semibold">{state.data.vehicleSize.label}</h3>
                {state.data.vehicleSize.description && (
                  <p className="text-gray-600 mt-2">{state.data.vehicleSize.description}</p>
                )}
            <p className="text-lg font-semibold text-primary-500 mt-2">
              {formatCurrency(state.data.vehicleSize.price_pence / 100)}
            </p>
          </div>
        </div>
          </div>
        ) : null}

        <div className="flex justify-end space-x-4">
          <Button
            onClick={handleNext}
            disabled={!state.data.vehicleSize || loading}
            variant="default"
          >
            Continue
          </Button>
        </div>
      </div>
    </Card>
  );
} 