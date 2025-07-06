import { NextResponse } from 'next/server';
import { BookingValidationService } from '@/lib/services/booking-validation';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// GET /api/bookings/available-slots?date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { 
          error: 'date parameter is required',
          message: 'Please provide a date parameter in YYYY-MM-DD format',
          example: '/api/bookings/available-slots?date=2025-01-08'
        }, 
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { 
          error: 'Invalid date format',
          message: 'Date must be in YYYY-MM-DD format',
          provided: date,
          example: '2025-01-08'
        }, 
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