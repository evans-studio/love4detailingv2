import { AvailabilityService } from './availability';
import { SLOT_TIMES } from '@/types';

export class BookingValidationService {
  static async validateBooking(
    date: string, 
    slotNumber: number, 
    excludeBookingId?: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Check if date is in the future
      const bookingDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (bookingDate < today) {
        return { isValid: false, error: 'Booking date must be in the future' };
      }
      
      // Check if slot number is valid (1-5)
      if (slotNumber < 1 || slotNumber > 5) {
        return { isValid: false, error: 'Invalid slot number' };
      }
      
      // Check business hours (slots should only be within 10:00-18:00)
      const slotTime = SLOT_TIMES[slotNumber];
      if (!slotTime) {
        return { isValid: false, error: 'Invalid time slot' };
      }
      
      // Check slot availability
      const isAvailable = await AvailabilityService.checkSlotAvailability(date, slotNumber);
      if (!isAvailable) {
        return { isValid: false, error: 'Selected time slot is not available' };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Booking validation error:', error);
      return { isValid: false, error: 'Validation failed - please try again' };
    }
  }

  static async getAvailableSlots(date: string): Promise<Array<{
    slot_number: number;
    time: string;
    display: string;
    available: boolean;
  }>> {
    try {
      const availableSlots = await AvailabilityService.getAvailableSlots(date);
      
      return Object.entries(SLOT_TIMES).map(([slotNum, slotInfo]) => {
        const slotNumber = parseInt(slotNum);
        const isAvailable = availableSlots.some(slot => slot.slot_number === slotNumber);
        
        return {
          slot_number: slotNumber,
          time: slotInfo.time,
          display: slotInfo.display,
          available: isAvailable
        };
      });
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  static validateBusinessHours(time: string): boolean {
    const hour = parseInt(time.split(':')[0]);
    return hour >= 10 && hour < 18;
  }

  static calculateEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours + 1, minutes, 0, 0);
    return endDate.toTimeString().slice(0, 5) + ':00';
  }
}