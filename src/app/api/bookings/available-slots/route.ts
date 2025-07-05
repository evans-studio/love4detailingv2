import { NextResponse } from 'next/server';
import { BookingValidationService } from '@/lib/services/booking-validation';

// GET /api/bookings/available-slots?date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { error: 'date parameter is required' }, 
        { status: 400 }
      );
    }

    const availableSlots = await BookingValidationService.getAvailableSlots(date);
    
    return NextResponse.json({ 
      date,
      slots: availableSlots 
    });
  } catch (error) {
    console.error('Available slots API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}