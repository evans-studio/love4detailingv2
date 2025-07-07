'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface UnmatchedVehicle {
  id: string;
  make: string;
  model: string;
  registration: string | null;
  created_at: string;
  matched_size: string;
  handled: boolean;
}

export function UnmatchedVehiclesCard() {
  const [vehicles, setVehicles] = useState<UnmatchedVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchUnmatchedVehicles();
  }, []);

  async function fetchUnmatchedVehicles() {
    try {
      const { data, error } = await supabase
        .from('unmatched_vehicles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching unmatched vehicles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsHandled(vehicleId: string, handled: boolean) {
    try {
      const { error } = await supabase.rpc('mark_vehicle_handled', {
        p_vehicle_id: vehicleId,
        p_handled: handled
      });

      if (error) throw error;
      await fetchUnmatchedVehicles();
    } catch (error) {
      console.error('Error updating vehicle status:', error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unmatched Vehicles</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <span className="loading loading-spinner" />
          </div>
        ) : vehicles.length === 0 ? (
          <p className="text-center text-muted">No unmatched vehicles found</p>
        ) : (
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h4 className="font-medium">
                    {vehicle.make} {vehicle.model}
                  </h4>
                  {vehicle.registration && (
                    <p className="text-sm text-muted">Reg: {vehicle.registration}</p>
                  )}
                  <p className="text-sm text-muted">
                    Size: {vehicle.matched_size}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(vehicle.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`handled-${vehicle.id}`}
                    checked={vehicle.handled}
                    onCheckedChange={(checked: boolean) => 
                      handleMarkAsHandled(vehicle.id, checked)
                    }
                  />
                  <label
                    htmlFor={`handled-${vehicle.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Handled
                  </label>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => fetchUnmatchedVehicles()}
            >
              Refresh List
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 