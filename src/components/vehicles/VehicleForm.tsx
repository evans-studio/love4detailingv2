'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { vehicleSchema } from '@/lib/validation/vehicle';
import type { Database } from '@/types/supabase';

interface VehicleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  onError: (error: string) => void;
}

type VehicleFormData = {
  registration: string;
  make: string;
  model: string;
  year: string;
  color: string;
};

export function VehicleForm({ onSuccess, onCancel, onError }: VehicleFormProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClientComponentClient<Database>();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
  });

  const onSubmit = async (data: VehicleFormData) => {
    setLoading(true);

    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      // Check for duplicate registration under this user
      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('registration', data.registration.toUpperCase())
        .eq('user_id', user.id)
        .single();

      if (existingVehicle) {
        onError('You already have a vehicle with this registration');
        return;
      }

      // Insert the vehicle
      const { error: insertError } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          registration: data.registration.toUpperCase(),
          make: data.make,
          model: data.model,
          year: data.year,
          color: data.color,
        });

      if (insertError) throw insertError;

      onSuccess();
    } catch (err) {
      console.error('Error adding vehicle:', err);
      onError('Failed to add vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Registration
        </label>
        <Input
          {...register('registration')}
          placeholder="Enter registration"
          className="uppercase"
        />
        {errors.registration && (
          <p className="mt-1 text-sm text-red-600">
            {errors.registration.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Make
        </label>
        <Input
          {...register('make')}
          placeholder="Enter make"
        />
        {errors.make && (
          <p className="mt-1 text-sm text-red-600">
            {errors.make.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Model
        </label>
        <Input
          {...register('model')}
          placeholder="Enter model"
        />
        {errors.model && (
          <p className="mt-1 text-sm text-red-600">
            {errors.model.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Year
        </label>
        <Input
          {...register('year')}
          placeholder="Enter year"
        />
        {errors.year && (
          <p className="mt-1 text-sm text-red-600">
            {errors.year.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Color
        </label>
        <Input
          {...register('color')}
          placeholder="Enter color"
        />
        {errors.color && (
          <p className="mt-1 text-sm text-red-600">
            {errors.color.message}
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  );
} 