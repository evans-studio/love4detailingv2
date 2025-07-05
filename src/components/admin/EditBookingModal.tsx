'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Save, 
  X, 
  Loader2,
  Calendar,
  User,
  Car
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { SLOT_TIMES } from '@/types';

interface TimeSlot {
  id: string;
  slot_date: string;
  slot_time: string;
  slot_number: number;
  is_available: boolean;
  is_booked: boolean;
  booking?: {
    id: string;
    customer_name: string;
    booking_reference: string;
  };
}

interface Booking {
  id: string;
  booking_reference: string;
  user_id: string;
  vehicle_id: string;
  time_slot_id: string;
  status: string;
  payment_status: string;
  total_price_pence: number;
  full_name: string;
  email: string;
  phone: string;
  notes?: string;
  created_at: string;
  vehicle?: {
    registration: string;
    make: string;
    model: string;
    year: string;
    color: string;
    vehicle_size?: {
      label: string;
      price_pence: number;
    };
  } | null;
  time_slot?: {
    slot_date: string;
    slot_time: string;
    slot_number?: number;
  } | null;
}

const editBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  payment_status: z.enum(['pending', 'paid', 'failed']),
  notes: z.string().optional(),
  slot_date: z.string().min(1, 'Date is required'),
  slot_number: z.number().min(1).max(5),
});

type EditBookingFormData = z.infer<typeof editBookingSchema>;

interface EditBookingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookingId: string, updates: any) => Promise<void>;
}

export function EditBookingModal({ booking, isOpen, onClose, onSave }: EditBookingModalProps) {
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const { toast } = useToast();

  const form = useForm<EditBookingFormData>({
    resolver: zodResolver(editBookingSchema),
    defaultValues: {
      status: 'pending',
      payment_status: 'pending',
      notes: '',
      slot_date: '',
      slot_number: 1,
    }
  });

  useEffect(() => {
    if (booking && isOpen) {
      const slotDate = booking.time_slot?.slot_date || '';
      const slotNumber = booking.time_slot?.slot_number || 1;
      
      form.reset({
        status: booking.status as any,
        payment_status: booking.payment_status as any,
        notes: booking.notes || '',
        slot_date: slotDate,
        slot_number: slotNumber,
      });
      
      setSelectedDate(slotDate);
      if (slotDate) {
        loadAvailableSlots(slotDate);
      }
    }
  }, [booking, isOpen]);

  const loadAvailableSlots = async (date: string) => {
    if (!date) return;
    
    try {
      setLoadingSlots(true);
      const response = await fetch(`/api/bookings/available-slots?date=${date}`);
      
      if (!response.ok) throw new Error('Failed to load available slots');
      
      const { data } = await response.json();
      setAvailableSlots(data);
    } catch (error) {
      console.error('Error loading available slots:', error);
      toast({
        title: 'Error',
        description: 'Failed to load available slots',
        variant: 'destructive'
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    form.setValue('slot_date', date);
    if (date) {
      loadAvailableSlots(date);
    } else {
      setAvailableSlots([]);
    }
  };

  const handleSlotSelect = (slotNumber: number) => {
    form.setValue('slot_number', slotNumber);
  };

  const handleSubmit = async (data: EditBookingFormData) => {
    if (!booking) return;
    
    try {
      setSaving(true);
      
      // Validate slot availability if it's different from current booking
      const currentSlotNumber = booking.time_slot?.slot_number;
      const currentSlotDate = booking.time_slot?.slot_date;
      
      if (data.slot_date !== currentSlotDate || data.slot_number !== currentSlotNumber) {
        const selectedSlot = availableSlots.find(slot => 
          slot.slot_number === data.slot_number && 
          slot.slot_date === data.slot_date
        );
        
        if (!selectedSlot) {
          toast({
            title: 'Slot Not Available',
            description: 'Please select an available slot',
            variant: 'destructive'
          });
          return;
        }
        
        if (selectedSlot.is_booked && selectedSlot.booking?.id !== booking.id) {
          toast({
            title: 'Slot Already Booked',
            description: 'This slot is already booked by another customer',
            variant: 'destructive'
          });
          return;
        }
      }
      
      await onSave(booking.id, {
        status: data.status,
        payment_status: data.payment_status,
        notes: data.notes,
        slot_date: data.slot_date,
        slot_number: data.slot_number,
      });
      
      toast({
        title: 'Success',
        description: 'Booking updated successfully',
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast({
        title: 'Error',
        description: 'Failed to update booking',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const getSlotStatus = (slot: TimeSlot) => {
    if (!slot.is_available) return 'unavailable';
    if (slot.is_booked) {
      if (slot.booking?.id === booking?.id) return 'current';
      return 'booked';
    }
    return 'available';
  };

  const getSlotStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'current':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'booked':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'unavailable':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getSlotStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'current':
        return <Clock className="h-3 w-3" />;
      case 'booked':
        return <XCircle className="h-3 w-3" />;
      case 'unavailable':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Edit Booking - {booking.booking_reference}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">{booking.full_name}</div>
                    <div className="text-sm text-gray-500">{booking.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {booking.vehicle?.registration || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {booking.vehicle?.make} {booking.vehicle?.model}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {booking.time_slot?.slot_date ? 
                        format(new Date(booking.time_slot.slot_date), 'PPP') : 
                        'No date set'
                      }
                    </div>
                    <div className="text-sm text-gray-500">
                      {booking.time_slot?.slot_number ? 
                        `Slot ${booking.time_slot.slot_number}` : 
                        'No slot'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Status Updates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Booking Status</Label>
                <Select 
                  value={form.watch('status')} 
                  onValueChange={(value) => form.setValue('status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select 
                  value={form.watch('payment_status')} 
                  onValueChange={(value) => form.setValue('payment_status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slot_date">Date</Label>
                <Input
                  id="slot_date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              {selectedDate && (
                <div className="space-y-2">
                  <Label>Available Time Slots</Label>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[1, 2, 3, 4, 5].map((slotNumber) => {
                        const slot = availableSlots.find(s => s.slot_number === slotNumber);
                        const slotConfig = SLOT_TIMES[slotNumber];
                        const status = slot ? getSlotStatus(slot) : 'unavailable';
                        const isSelected = form.watch('slot_number') === slotNumber;
                        const isClickable = status === 'available' || status === 'current';
                        
                        return (
                          <div
                            key={slotNumber}
                            className={`
                              p-3 rounded-lg border cursor-pointer transition-all
                              ${getSlotStatusColor(status)}
                              ${isSelected ? 'ring-2 ring-blue-500' : ''}
                              ${isClickable ? 'hover:opacity-80' : 'cursor-not-allowed opacity-60'}
                            `}
                            onClick={() => isClickable && handleSlotSelect(slotNumber)}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {getSlotStatusIcon(status)}
                              <span className="font-medium text-sm">
                                Slot {slotNumber}
                              </span>
                            </div>
                            <div className="text-xs">
                              {slotConfig?.display || 'Unknown time'}
                            </div>
                            {slot?.booking && slot.booking.id !== booking.id && (
                              <div className="text-xs mt-1 truncate">
                                {slot.booking.customer_name}
                              </div>
                            )}
                            {status === 'current' && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                {...form.register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any notes about this booking..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Update Booking
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}