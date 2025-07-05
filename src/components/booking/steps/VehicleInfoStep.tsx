'use client';

import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { 
  getUniqueMakes, 
  getModelsForMake, 
  getSizeForVehicle, 
  getSizeLabel,
  sizeMap 
} from '@/lib/utils/vehicle-data';
import type { UnifiedBookingForm } from '@/lib/validation/booking';

interface VehicleInfoStepProps {
  onNext: () => void;
  vehicleSizes: Array<{
    id: string;
    label: string;
    description: string;
    price_pence: number;
  }>;
}

export function VehicleInfoStep({ onNext, vehicleSizes }: VehicleInfoStepProps) {
  const { 
    register, 
    watch, 
    setValue, 
    formState: { errors },
    trigger
  } = useFormContext<UnifiedBookingForm>();

  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [detectedSize, setDetectedSize] = useState<keyof typeof sizeMap | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string>('');

  // Watch form values
  const watchedMake = watch('vehicle.make');
  const watchedModel = watch('vehicle.model');

  // Load makes on mount
  useEffect(() => {
    const uniqueMakes = getUniqueMakes();
    setMakes(uniqueMakes);
  }, []);

  // Handle make change
  useEffect(() => {
    if (watchedMake && watchedMake !== selectedMake) {
      setSelectedMake(watchedMake);
      const modelsForMake = getModelsForMake(watchedMake);
      setModels(modelsForMake);
      
      // Clear model and size when make changes
      setValue('vehicle.model', '');
      setValue('vehicle.sizeId', '');
      setValue('vehicle.size', '');
      setSelectedModel('');
      setDetectedSize(null);
      setSelectedSizeId('');
    }
  }, [watchedMake, selectedMake, setValue]);

  // Handle model change and size detection
  useEffect(() => {
    if (watchedModel && selectedMake && watchedModel !== selectedModel) {
      setSelectedModel(watchedModel);
      
      // Auto-detect size
      const size = getSizeForVehicle(selectedMake, watchedModel);
      if (size) {
        setDetectedSize(size);
        
        // Map size to database size label and find corresponding size ID
        const sizeLabel = getSizeLabel(size);
        const matchingSize = vehicleSizes.find(vs => 
          vs.label.toLowerCase() === sizeLabel.toLowerCase()
        );
        
        if (matchingSize) {
          setValue('vehicle.sizeId', matchingSize.id);
          setValue('vehicle.size', matchingSize.label);
          setSelectedSizeId(matchingSize.id);
        }
      }
    }
  }, [watchedModel, selectedMake, selectedModel, setValue, vehicleSizes]);

  // Handle size override
  const handleSizeChange = (sizeId: string) => {
    setSelectedSizeId(sizeId);
    const selectedSize = vehicleSizes.find(vs => vs.id === sizeId);
    if (selectedSize) {
      setValue('vehicle.sizeId', sizeId);
      setValue('vehicle.size', selectedSize.label);
    }
  };

  // Handle form submission
  const handleNext = async () => {
    const isValid = await trigger(['vehicle.make', 'vehicle.model', 'vehicle.registration', 'vehicle.sizeId']);
    if (isValid) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Vehicle Information</h2>
        <p className="text-gray-600 mb-6">
          Please provide details about your vehicle
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Make */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Make *
          </label>
          <Select value={watchedMake} onValueChange={(value) => setValue('vehicle.make', value)}>
            <SelectTrigger className={errors.vehicle?.make ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select make" />
            </SelectTrigger>
            <SelectContent>
              {makes.map((make) => (
                <SelectItem key={make} value={make}>
                  {make}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vehicle?.make && (
            <p className="mt-1 text-sm text-red-600">{errors.vehicle.make.message}</p>
          )}
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model *
          </label>
          <Select 
            value={watchedModel} 
            onValueChange={(value) => setValue('vehicle.model', value)}
            disabled={!selectedMake}
          >
            <SelectTrigger className={errors.vehicle?.model ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.vehicle?.model && (
            <p className="mt-1 text-sm text-red-600">{errors.vehicle.model.message}</p>
          )}
        </div>

        {/* Registration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Registration *
          </label>
          <Input
            {...register('vehicle.registration')}
            placeholder="e.g. AB12 CDE"
            error={!!errors.vehicle?.registration}
            className="uppercase"
          />
          {errors.vehicle?.registration && (
            <p className="mt-1 text-sm text-red-600">{errors.vehicle.registration.message}</p>
          )}
        </div>

        {/* Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Year (Optional)
          </label>
          <Input
            {...register('vehicle.year')}
            placeholder="e.g. 2020"
            type="number"
            min="1900"
            max={new Date().getFullYear() + 1}
          />
        </div>

        {/* Color */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color (Optional)
          </label>
          <Input
            {...register('vehicle.color')}
            placeholder="e.g. Blue"
          />
        </div>
      </div>

      {/* Vehicle Size Detection */}
      {detectedSize && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-3">
            Vehicle Size Detection
          </h3>
          <p className="text-sm text-blue-800 mb-3">
            Based on your {selectedMake} {selectedModel}, we've detected the size as{' '}
            <strong>{getSizeLabel(detectedSize)}</strong>. You can override this if needed.
          </p>
        </div>
      )}

      {/* Size Selection */}
      {vehicleSizes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Vehicle Size *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {vehicleSizes.map((size) => (
              <button
                key={size.id}
                type="button"
                onClick={() => handleSizeChange(size.id)}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedSizeId === size.id
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{size.label}</div>
                <div className="text-sm text-gray-600 mt-1">{size.description}</div>
                <div className="text-sm font-medium text-primary-600 mt-2">
                  £{(size.price_pence / 100).toFixed(2)}
                </div>
              </button>
            ))}
          </div>
          {errors.vehicle?.sizeId && (
            <p className="mt-2 text-sm text-red-600">{errors.vehicle.sizeId.message}</p>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Next: Personal Details
        </button>
      </div>
    </div>
  );
}