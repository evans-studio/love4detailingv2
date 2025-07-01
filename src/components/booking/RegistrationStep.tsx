'use client';

import { useState, useEffect } from 'react';
import { useBooking, BookingStep } from '@/lib/context/BookingContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ComboBox } from '@/components/ui/ComboBox';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getUniqueMakes, getModelsForMake, getSizeForVehicle, getSizeLabel, sizeMap } from '@/lib/utils/vehicle-data';
import type { VehicleEntry } from '@/lib/utils/vehicle-data';

export function RegistrationStep() {
  const { state, dispatch } = useBooking();
  const [loading, setLoading] = useState(false);
  const [makes, setMakes] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [modelInput, setModelInput] = useState<string>('');
  const [modelSuggestions, setModelSuggestions] = useState<Array<{ model: string; trim: string }>>([]);
  const [vehicleData, setVehicleData] = useState<VehicleEntry[]>([]);
  const supabase = createClientComponentClient();

  // Load makes and full vehicle data on mount
  useEffect(() => {
    setMakes(getUniqueMakes());
    // Load the full vehicle data for suggestions
    const data = require('@/../../vehicle-size-data.json') as VehicleEntry[];
    setVehicleData(data);
  }, []);

  // Update model suggestions when make changes
  useEffect(() => {
    if (selectedMake) {
      // Get unique models for the selected make (without trims)
      const suggestions = vehicleData
        .filter(entry => entry.make === selectedMake)
        .reduce((acc, entry) => {
          // Only add each model once, ignore trims
          if (!acc.some(item => item.model === entry.model)) {
            acc.push({
              model: entry.model,
              trim: '' // Keep trim empty as we're not using it
            });
          }
          return acc;
        }, [] as Array<{ model: string; trim: string }>);

      setModelSuggestions(suggestions);
      setModelInput(''); // Reset model input when make changes
    }
  }, [selectedMake, vehicleData]);

  const handleMakeChange = (value: string) => {
    setSelectedMake(value);
    dispatch({
      type: 'SET_VEHICLE_DETAILS',
      payload: {
        make: value,
        model: '',
        registration: state.data.vehicle?.registration || '',
        year: '',
        color: '',
        fuelType: '',
        vehicleType: 'Car'
      }
    });
  };

  const handleModelSelect = async (model: string, trim: string) => {
    setLoading(true);
    
    try {
      // Get size from our JSON data - match any trim for this model
      const matchingEntry = vehicleData.find(
        entry => entry.make === selectedMake && entry.model === model
      );

      const sizeCode = matchingEntry?.size || 'M'; // Default to Medium if not found
      const sizeLabel = sizeMap[sizeCode];
      
      // Query Supabase for the vehicle size ID and pricing
      const { data: sizeData, error } = await supabase
        .from('vehicle_sizes')
        .select('id, price_pence')
        .eq('label', sizeLabel)
        .single();
        
      if (error) throw error;

      // Update vehicle details in context
      dispatch({
        type: 'SET_VEHICLE_DETAILS',
        payload: {
          make: selectedMake,
          model: model,
          registration: state.data.vehicle?.registration || '',
          year: '',
          color: '',
          fuelType: '',
          vehicleType: 'Car'
        }
      });

      // Update vehicle size in context
      dispatch({
        type: 'SET_VEHICLE_SIZE',
        payload: {
          id: sizeData.id,
          label: sizeLabel,
          price_pence: sizeData.price_pence
        }
      });

      // If this model wasn't in our database, log it for future updates
      if (!matchingEntry) {
        await supabase.from('unmatched_vehicles').insert({
          make: selectedMake,
          model: model,
          trim: null,
          registration: state.data.vehicle?.registration || null,
          created_at: new Date().toISOString()
        });
      }

      // Proceed to next step automatically since size is determined
      dispatch({ type: 'SET_STEP', payload: BookingStep.PersonalDetails });

    } catch (err) {
      console.error('Error setting vehicle size:', err);
      dispatch({
        type: 'SET_ERROR',
        payload: 'Failed to set vehicle size. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!selectedMake || !modelInput) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Please select both make and model'
      });
      return;
    }
    dispatch({ type: 'SET_STEP', payload: BookingStep.PersonalDetails });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Select Your Vehicle</h2>
          <p className="text-gray-600 mb-4">
            Choose your vehicle make and model
          </p>
        </div>

        <div className="space-y-4">
          {/* Make Dropdown */}
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

          {/* Model Autocomplete */}
          {selectedMake && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <AutocompleteInput
                value={modelInput}
                onChange={setModelInput}
                onSelect={handleModelSelect}
                suggestions={modelSuggestions}
                placeholder="Start typing to find your model"
              />
            </div>
          )}

          {/* Registration Input */}
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

          {/* Error Display */}
          {state.error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-md">
              {state.error}
            </div>
          )}

          {/* Size Preview */}
          {state.data.vehicleSize && (
            <div className="mt-6 space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold">Vehicle Size</h3>
                <p className="text-gray-700">
                  Your vehicle is classified as: <span className="font-medium">{state.data.vehicleSize.label}</span>
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8">
            <Button
              onClick={handleNext}
              disabled={!selectedMake || !modelInput || loading}
              variant="default"
              className="w-full"
            >
              {loading ? 'Loading...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 