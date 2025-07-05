'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Save,
  AlertCircle 
} from 'lucide-react';
import { format } from 'date-fns';

interface BusinessHours {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
}

interface BusinessClosure {
  id: string;
  closure_date: string;
  reason: string;
  is_recurring: boolean;
}

const businessHoursSchema = z.object({
  hours: z.array(z.object({
    day_of_week: z.number(),
    is_open: z.boolean(),
    open_time: z.string().nullable(),
    close_time: z.string().nullable(),
  }))
});

const closureSchema = z.object({
  closure_date: z.string().min(1, 'Date is required'),
  reason: z.string().min(1, 'Reason is required'),
  is_recurring: z.boolean().default(false),
});

type BusinessHoursFormData = z.infer<typeof businessHoursSchema>;
type ClosureFormData = z.infer<typeof closureSchema>;

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export default function AvailabilityManagement() {
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([]);
  const [closures, setClosures] = useState<BusinessClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showClosureForm, setShowClosureForm] = useState(false);
  const supabase = createClientComponentClient();

  const hoursForm = useForm<BusinessHoursFormData>({
    resolver: zodResolver(businessHoursSchema),
  });

  const closureForm = useForm<ClosureFormData>({
    resolver: zodResolver(closureSchema),
    defaultValues: {
      is_recurring: false,
    }
  });

  useEffect(() => {
    fetchAvailabilityData();
  }, []);

  const fetchAvailabilityData = async () => {
    try {
      const [hoursRes, closuresRes] = await Promise.all([
        supabase
          .from('business_hours')
          .select('*')
          .order('day_of_week'),
        supabase
          .from('business_closures')
          .select('*')
          .order('closure_date', { ascending: false })
      ]);

      if (hoursRes.error) throw hoursRes.error;
      if (closuresRes.error) throw closuresRes.error;

      // Ensure we have entries for all 7 days
      const allDays = Array.from({ length: 7 }, (_, i) => {
        const existing = hoursRes.data?.find(h => h.day_of_week === i);
        return existing || {
          id: '',
          day_of_week: i,
          is_open: i >= 1 && i <= 5, // Default: open Mon-Fri
          open_time: '09:00:00',
          close_time: '17:00:00'
        };
      });

      setBusinessHours(allDays);
      setClosures(closuresRes.data || []);
      
      // Set form values
      hoursForm.setValue('hours', allDays);
    } catch (error) {
      console.error('Error fetching availability data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessHours = async (data: BusinessHoursFormData) => {
    setSaving(true);
    try {
      const updates = data.hours.map(hours => ({
        day_of_week: hours.day_of_week,
        is_open: hours.is_open,
        open_time: hours.is_open ? hours.open_time : null,
        close_time: hours.is_open ? hours.close_time : null,
      }));

      // Upsert each day's hours
      for (const update of updates) {
        const { error } = await supabase
          .from('business_hours')
          .upsert(update, { 
            onConflict: 'day_of_week',
          });
        
        if (error) throw error;
      }

      await fetchAvailabilityData();
      alert('Business hours updated successfully!');
    } catch (error) {
      console.error('Error saving business hours:', error);
      alert('Failed to update business hours. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addClosure = async (data: ClosureFormData) => {
    try {
      const { error } = await supabase
        .from('business_closures')
        .insert([data]);

      if (error) throw error;

      await fetchAvailabilityData();
      setShowClosureForm(false);
      closureForm.reset();
      alert('Closure added successfully!');
    } catch (error) {
      console.error('Error adding closure:', error);
      alert('Failed to add closure. Please try again.');
    }
  };

  const removeClosure = async (id: string) => {
    if (!confirm('Are you sure you want to remove this closure?')) return;

    try {
      const { error } = await supabase
        .from('business_closures')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAvailabilityData();
      alert('Closure removed successfully!');
    } catch (error) {
      console.error('Error removing closure:', error);
      alert('Failed to remove closure. Please try again.');
    }
  };

  const updateDayHours = (dayIndex: number, field: string, value: any) => {
    const currentHours = hoursForm.getValues('hours');
    const updatedHours = [...currentHours];
    updatedHours[dayIndex] = { ...updatedHours[dayIndex], [field]: value };
    hoursForm.setValue('hours', updatedHours);
  };

  if (loading) {
    return <LoadingState>Loading availability settings...</LoadingState>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Availability Management</h1>
        <p className="text-gray-600 mt-1">
          Manage your business hours and closure dates
        </p>
      </div>

      {/* Business Hours */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Business Hours</h2>
            <p className="text-gray-600 mt-1">Set your default working hours for each day of the week</p>
          </div>
          <Button 
            onClick={hoursForm.handleSubmit(saveBusinessHours)}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Hours'}
          </Button>
        </div>

        <div className="space-y-4">
          {DAYS_OF_WEEK.map((dayName, dayIndex) => {
            const dayHours = hoursForm.watch('hours')?.[dayIndex];
            return (
              <div key={dayIndex} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-20">
                    <span className="font-medium text-gray-900">{dayName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={dayHours?.is_open || false}
                      onChange={(e) => updateDayHours(dayIndex, 'is_open', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Open</span>
                  </div>
                </div>

                {dayHours?.is_open && (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <Input
                        type="time"
                        value={dayHours.open_time || '09:00'}
                        onChange={(e) => updateDayHours(dayIndex, 'open_time', e.target.value + ':00')}
                        className="w-32"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={dayHours.close_time ? dayHours.close_time.slice(0, 5) : '17:00'}
                        onChange={(e) => updateDayHours(dayIndex, 'close_time', e.target.value + ':00')}
                        className="w-32"
                      />
                    </div>
                  </div>
                )}

                {!dayHours?.is_open && (
                  <Badge variant="secondary">Closed</Badge>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Closures */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Business Closures</h2>
            <p className="text-gray-600 mt-1">Block out specific dates for holidays or time off</p>
          </div>
          <Button onClick={() => setShowClosureForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Closure
          </Button>
        </div>

        {/* Add Closure Form */}
        {showClosureForm && (
          <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
            <form onSubmit={closureForm.handleSubmit(addClosure)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closure Date
                  </label>
                  <Input
                    type="date"
                    {...closureForm.register('closure_date')}
                    error={!!closureForm.formState.errors.closure_date}
                  />
                  {closureForm.formState.errors.closure_date && (
                    <p className="text-red-600 text-sm mt-1">
                      {closureForm.formState.errors.closure_date.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Holiday, Maintenance..."
                    {...closureForm.register('reason')}
                    error={!!closureForm.formState.errors.reason}
                  />
                  {closureForm.formState.errors.reason && (
                    <p className="text-red-600 text-sm mt-1">
                      {closureForm.formState.errors.reason.message}
                    </p>
                  )}
                </div>

                <div className="flex items-end space-x-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...closureForm.register('is_recurring')}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-600">Recurring annually</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Closure
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowClosureForm(false);
                    closureForm.reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Closures List */}
        {closures.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No closures scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {closures.map((closure) => (
              <div key={closure.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">
                      {format(new Date(closure.closure_date), 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="text-sm text-gray-600">{closure.reason}</div>
                  </div>
                  {closure.is_recurring && (
                    <Badge variant="outline">Recurring</Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeClosure(closure.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Important Note</p>
            <p className="text-amber-700 mt-1">
              Changes to business hours and closures will affect future bookings. 
              Existing bookings will not be automatically modified.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}