import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const createSlotSchema = z.object({
  action: z.enum(['create', 'delete']),
  slotId: z.string().uuid().optional(),
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  durationMinutes: z.number().min(30).max(480),
  maxBookings: z.number().min(1).max(10)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Use service role for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Validate request data
    const validatedData = createSlotSchema.parse(body)
    
    if (validatedData.action === 'create') {
      // Calculate end time
      const startTime = validatedData.startTime
      const durationMinutes = validatedData.durationMinutes
      
      // Convert start time to minutes
      const [hours, minutes] = startTime.split(':').map(Number)
      const startMinutes = hours * 60 + minutes
      const endMinutes = startMinutes + durationMinutes
      
      // Convert back to time string
      const endHours = Math.floor(endMinutes / 60)
      const endMins = endMinutes % 60
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`
      
      // Insert the slot
      const { data, error } = await supabase
        .from('available_slots')
        .insert({
          slot_date: validatedData.slotDate,
          start_time: validatedData.startTime,
          end_time: endTime,
          max_bookings: validatedData.maxBookings,
          current_bookings: 0,
          is_blocked: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error('Error creating slot:', error)
        return NextResponse.json(
          { error: 'Failed to create slot: ' + error.message },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'Slot created successfully',
        data
      })
    }
    
    if (validatedData.action === 'delete') {
      if (!validatedData.slotId) {
        return NextResponse.json(
          { error: 'Slot ID is required for delete action' },
          { status: 400 }
        )
      }
      
      const { error } = await supabase
        .from('available_slots')
        .delete()
        .eq('id', validatedData.slotId)
      
      if (error) {
        console.error('Error deleting slot:', error)
        return NextResponse.json(
          { error: 'Failed to delete slot: ' + error.message },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'Slot deleted successfully'
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}