'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loadingState';
import { Alert } from '@/components/ui/alert';
import type { Database } from '@/types/supabase';

interface VehicleListProps {
  onError: (error: string) => void;
  onDeleteSuccess: () => void;
}

type Vehicle = Database['public']['Tables']['vehicles']['Row'] & {
  vehicle_sizes: {
    id: string;
    label: string;
    description: string | null;
    price_pence: number;
  } | null;
};

export function VehicleList({ onError, onDeleteSuccess }: VehicleListProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          vehicle_sizes (
            id,
            label,
            description,
            price_pence
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicles:', error);
        throw error;
      }

      setVehicles(data || []);
    } catch (err) {
      console.error('Error loading vehicles:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load vehicles';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    setDeleteLoading(vehicleId);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Not authenticated');

      // First check if the vehicle belongs to the user
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('id', vehicleId)
        .eq('user_id', user.id)
        .single();

      if (vehicleError || !vehicle) {
        throw new Error('Vehicle not found or access denied');
      }

      // Check if vehicle is used in any bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .limit(1);

      if (bookingsError) throw bookingsError;

      if (bookings && bookings.length > 0) {
        throw new Error('Cannot delete vehicle - it has associated bookings');
      }

      // Then delete the vehicle
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh the list
      await loadVehicles();
      onDeleteSuccess();
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete vehicle';
      onError(errorMessage);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return <LoadingState>Loading vehicles...</LoadingState>;
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        {error}
      </Alert>
    );
  }

  if (vehicles.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-gray-600">No vehicles found</p>
          <p className="text-sm text-gray-500 mt-1">
            Add a vehicle to start booking services
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {vehicles.map((vehicle) => (
        <Card key={vehicle.id} className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">
                {vehicle.make} {vehicle.model}
              </h3>
              <p className="text-sm text-gray-600">
                {vehicle.registration}
              </p>
              <p className="text-sm text-gray-500">
                {vehicle.year} • {vehicle.color}
              </p>
              {vehicle.vehicle_sizes && (
                <p className="text-sm text-gray-500 mt-1">
                  Size: {vehicle.vehicle_sizes.label} • 
                  Price: £{(vehicle.vehicle_sizes.price_pence / 100).toFixed(2)}
                </p>
              )}
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(vehicle.id)}
              disabled={deleteLoading === vehicle.id}
            >
              {deleteLoading === vehicle.id ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
} 