'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/Badge';
// Using alert() for notifications to match existing codebase pattern
import { Card, CardContent } from '@/components/ui/Card';
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
  // Using alert() for notifications

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
      alert('Failed to load available slots. Please try again.');
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
          alert('Please select an available slot.');
          return;
        }
        
        if (selectedSlot.is_booked && selectedSlot.booking?.id !== booking.id) {
          alert('This slot is already booked by another customer.');
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
      
      alert('Booking updated successfully!');
      
      onClose();
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking. Please try again.');
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
        return 'bg-green-900/20 text-green-400 border-green-700';
      case 'current':
        return 'bg-[#9146FF]/20 text-[#9146FF] border-[#9146FF]/50';
      case 'booked':
        return 'bg-red-900/20 text-red-400 border-red-700';
      case 'unavailable':
        return 'bg-gray-800 text-gray-500 border-gray-700';
      default:
        return 'bg-gray-800 text-gray-500 border-gray-700';
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
          {/* Customer Information Section */}
          <Card className="bg-[#262626] border-gray-700">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-[#9146FF] mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-[#C7C7C7] mb-1">Name</div>
                  <div className="font-medium text-[#F2F2F2]">{booking.full_name}</div>
                </div>
                <div>
                  <div className="text-sm text-[#C7C7C7] mb-1">Email</div>
                  <div className="font-medium text-[#F2F2F2]">{booking.email}</div>
                </div>
                <div>
                  <div className="text-sm text-[#C7C7C7] mb-1">Phone</div>
                  <div className="font-medium text-[#F2F2F2]">{booking.phone || 'Not provided'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Details Section */}
          <Card className="bg-[#262626] border-gray-700">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-[#9146FF] mb-4 flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-[#C7C7C7] mb-1">Registration</div>
                  <div className="font-medium text-[#F2F2F2]">{booking.vehicle?.registration || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-sm text-[#C7C7C7] mb-1">Make & Model</div>
                  <div className="font-medium text-[#F2F2F2]">
                    {booking.vehicle?.make} {booking.vehicle?.model}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#C7C7C7] mb-1">Size & Price</div>
                  <div className="font-medium text-[#F2F2F2]">
                    {booking.vehicle?.vehicle_size?.label} - £{((booking.total_price_pence || 0) / 100).toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details Section */}
          <Card className="bg-[#262626] border-gray-700">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold text-[#9146FF] mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-[#C7C7C7] mb-1">Current Date</div>
                  <div className="font-medium text-[#F2F2F2]">
                    {booking.time_slot?.slot_date ? 
                      format(new Date(booking.time_slot.slot_date), 'PPP') : 
                      'No date set'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#C7C7C7] mb-1">Current Time</div>
                  <div className="font-medium text-[#F2F2F2]">
                    {booking.time_slot?.slot_number ? 
                      `Slot ${booking.time_slot.slot_number}` : 
                      'No slot'
                    }
                  </div>
                </div>
                <div>
                  <div className="text-sm text-[#C7C7C7] mb-1">Booking Reference</div>
                  <div className="font-medium text-[#F2F2F2]">{booking.booking_reference}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Status Management Section */}
            <Card className="bg-[#262626] border-gray-700">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-[#9146FF] mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Status Management
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-[#F2F2F2]">Booking Status</Label>
                    <Select 
                      value={form.watch('status')} 
                      onValueChange={(value) => form.setValue('status', value as any)}
                    >
                      <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-[#F2F2F2]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-gray-700">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_status" className="text-[#F2F2F2]">Payment Status</Label>
                    <Select 
                      value={form.watch('payment_status')} 
                      onValueChange={(value) => form.setValue('payment_status', value as any)}
                    >
                      <SelectTrigger className="bg-[#1A1A1A] border-gray-700 text-[#F2F2F2]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-gray-700">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Slot Selection Section */}
            <Card className="bg-[#262626] border-gray-700">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-[#9146FF] mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Reschedule Appointment
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="slot_date" className="text-[#F2F2F2]">Select New Date</Label>
                    <Input
                      id="slot_date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="bg-[#1A1A1A] border-gray-700 text-[#F2F2F2]"
                    />
                  </div>

                  {selectedDate && (
                    <div className="space-y-2">
                      <Label className="text-[#F2F2F2]">Available Time Slots</Label>
                      {loadingSlots ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-[#9146FF]" />
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
                                  ${isSelected ? 'ring-2 ring-[#9146FF]' : ''}
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
                                  <Badge variant="outline" className="mt-1 text-xs border-[#9146FF] text-[#9146FF]">
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
              </CardContent>
            </Card>

            {/* Admin Notes Section */}
            <Card className="bg-[#262626] border-gray-700">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold text-[#9146FF] mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Admin Notes
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-[#F2F2F2]">Internal Notes</Label>
                  <textarea
                    id="notes"
                    {...form.register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-gray-700 text-[#F2F2F2] rounded-md focus:outline-none focus:ring-2 focus:ring-[#9146FF] focus:border-transparent placeholder-gray-500"
                    placeholder="Add any internal notes about this booking..."
                  />
                </div>
              </CardContent>
            </Card>

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