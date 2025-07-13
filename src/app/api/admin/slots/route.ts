import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { z } from 'zod'

// Simplified slot management schema (no template dependencies)
const manageSlotSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'block', 'unblock']),
  slotId: z.string().uuid().optional(),
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  maxBookings: z.number().min(1).max(10).optional()
})

const generateSlotsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlots: z.array(z.object({
    startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
    maxBookings: z.number().min(1).max(10).optional()
  })),
  skipWeekends: z.boolean().optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const body = await request.json()
    
    // Get current user and verify admin permissions
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify admin role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !userProfile.role || !['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Handle bulk slot generation
    if (body.action === 'generate') {
      const validatedData = generateSlotsSchema.parse(body)
      
      const startDate = new Date(validatedData.startDate)
      const endDate = new Date(validatedData.endDate)
      const slots = []
      
      // Generate slots for each day in the range
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay()
        
        // Skip weekends if requested
        if (validatedData.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
          continue
        }
        
        // Create slots for this date
        for (const timeSlot of validatedData.timeSlots) {
          slots.push({
            slot_date: date.toISOString().split('T')[0],
            start_time: timeSlot.startTime,
            end_time: timeSlot.endTime,
            max_bookings: timeSlot.maxBookings || 1,
            current_bookings: 0,
            is_blocked: false,
            created_at: new Date().toISOString()
          })
        }
      }

      if (slots.length > 0) {
        const { data, error } = await supabase
          .from('available_slots')
          .insert(slots)
          .select()

        if (error) {
          console.error('Error creating slots:', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: `Generated ${data.length} slots`,
          slotsCreated: data.length,
          dateRange: {
            start: validatedData.startDate,
            end: validatedData.endDate
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: 'No slots to create',
        slotsCreated: 0
      })
    }

    // Handle individual slot management
    const validatedData = manageSlotSchema.parse(body)
    
    switch (validatedData.action) {
      case 'create':
        if (!validatedData.slotDate || !validatedData.startTime || !validatedData.endTime) {
          return NextResponse.json(
            { error: 'Date, start time, and end time are required for creating slots' },
            { status: 400 }
          )
        }

        const { data: newSlot, error: createError } = await supabase
          .from('available_slots')
          .insert({
            slot_date: validatedData.slotDate,
            start_time: validatedData.startTime,
            end_time: validatedData.endTime,
            max_bookings: validatedData.maxBookings || 1,
            current_bookings: 0,
            is_blocked: false,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating slot:', createError)
          return NextResponse.json({ error: createError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Slot created successfully',
          slotId: newSlot.id,
          action: 'create'
        })

      case 'update':
        if (!validatedData.slotId) {
          return NextResponse.json(
            { error: 'Slot ID is required for updates' },
            { status: 400 }
          )
        }

        const updateData: any = {}
        if (validatedData.slotDate) updateData.slot_date = validatedData.slotDate
        if (validatedData.startTime) updateData.start_time = validatedData.startTime
        if (validatedData.endTime) updateData.end_time = validatedData.endTime
        if (validatedData.maxBookings) updateData.max_bookings = validatedData.maxBookings

        const { data: updatedSlot, error: updateError } = await supabase
          .from('available_slots')
          .update(updateData)
          .eq('id', validatedData.slotId)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating slot:', updateError)
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Slot updated successfully',
          slotId: updatedSlot.id,
          action: 'update'
        })

      case 'delete':
        if (!validatedData.slotId) {
          return NextResponse.json(
            { error: 'Slot ID is required for deletion' },
            { status: 400 }
          )
        }

        // Check if slot has bookings
        const { data: slot, error: slotError } = await supabase
          .from('available_slots')
          .select('current_bookings')
          .eq('id', validatedData.slotId)
          .single()

        if (slotError) {
          return NextResponse.json({ error: slotError.message }, { status: 500 })
        }

        if ((slot.current_bookings || 0) > 0) {
          return NextResponse.json(
            { error: 'Cannot delete slot with existing bookings' },
            { status: 400 }
          )
        }

        const { error: deleteError } = await supabase
          .from('available_slots')
          .delete()
          .eq('id', validatedData.slotId)

        if (deleteError) {
          console.error('Error deleting slot:', deleteError)
          return NextResponse.json({ error: deleteError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Slot deleted successfully',
          slotId: validatedData.slotId,
          action: 'delete'
        })

      case 'block':
      case 'unblock':
        if (!validatedData.slotId) {
          return NextResponse.json(
            { error: 'Slot ID is required for blocking/unblocking' },
            { status: 400 }
          )
        }

        const isBlocked = validatedData.action === 'block'
        const { data: blockedSlot, error: blockError } = await supabase
          .from('available_slots')
          .update({ is_blocked: isBlocked })
          .eq('id', validatedData.slotId)
          .select()
          .single()

        if (blockError) {
          console.error('Error updating slot:', blockError)
          return NextResponse.json({ error: blockError.message }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: `Slot ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
          slotId: blockedSlot.id,
          action: validatedData.action
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

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

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    const { searchParams } = new URL(request.url)
    
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const isBlocked = searchParams.get('is_blocked')
    
    // Query simplified available slots
    let query = supabase
      .from('available_slots')
      .select(`
        id,
        slot_date,
        start_time,
        end_time,
        max_bookings,
        current_bookings,
        is_blocked,
        created_at
      `)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true })

    // Apply date filters if provided
    if (startDate) {
      query = query.gte('slot_date', startDate)
    }
    
    if (endDate) {
      query = query.lte('slot_date', endDate)
    }
    
    if (isBlocked !== null) {
      query = query.eq('is_blocked', isBlocked === 'true')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching available slots:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform data to include availability status
    const transformedSlots = data?.map(slot => ({
      ...slot,
      is_available: !slot.is_blocked && (slot.current_bookings || 0) < (slot.max_bookings || 1),
      availability_status: slot.is_blocked 
        ? 'blocked' 
        : (slot.current_bookings || 0) >= (slot.max_bookings || 1)
        ? 'fully_booked'
        : 'available'
    })) || []

    return NextResponse.json({ 
      data: transformedSlots,
      count: transformedSlots.length
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}