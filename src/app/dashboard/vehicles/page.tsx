'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { VehicleForm } from '@/components/vehicles/VehicleForm';
import { VehicleList } from '@/components/vehicles/VehicleList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export default function VehiclesPage() {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  const handleAddVehicle = () => {
    setShowForm(true);
    setError(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setError(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setError(null);
    router.refresh();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#F2F2F2]">My Vehicles</h1>
          {!showForm && (
            <Button onClick={handleAddVehicle}>
              Add Vehicle
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        {showForm ? (
          <Card className="p-6 bg-[#1E1E1E] border-gray-800">
            <VehicleForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
              onError={setError}
            />
          </Card>
        ) : (
          <VehicleList
            onError={setError}
            onDeleteSuccess={() => router.refresh()}
          />
        )}
      </div>
    </DashboardLayout>
  );
} 