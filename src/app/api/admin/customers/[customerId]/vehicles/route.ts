import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET customer vehicles for admin
export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get('admin_id')
    const customerId = params.customerId

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID required' },
        { status: 400 }
      )
    }

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID required' },
        { status: 400 }
      )
    }

    console.log('🚗 Fetching vehicles for customer:', { customerId, adminId })
    
    // First, verify the customer exists
    const { data: customer, error: customerError } = await supabase.auth.admin.getUserById(customerId)
    if (customerError || !customer.user) {
      console.log('❌ Customer not found:', customerError?.message)
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }
    
    console.log('✅ Customer verified:', customer.user.email)

    // Verify admin permissions
    const { data: adminProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', adminId)
      .single()

    // Allow access if user_profiles table doesn't exist (initial setup) or user is admin
    if (profileError && !profileError.message.includes('does not exist')) {
      console.error('❌ Error fetching admin profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to verify admin permissions' },
        { status: 500 }
      )
    }

    if (adminProfile && !['admin', 'super_admin', 'staff'].includes(adminProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Fetch customer vehicles with graceful error handling
    console.log('🔍 Querying vehicles for user_id:', customerId)
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(`
        id,
        registration,
        make,
        model,
        year,
        color,
        size,
        size_confirmed,
        is_active,
        created_at,
        updated_at,
        user_id
      `)
      .eq('user_id', customerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    console.log('🔍 Raw vehicles query result:', { vehicles, vehiclesError })

    if (vehiclesError) {
      console.error('❌ Error fetching customer vehicles:', vehiclesError)
      
      // If table doesn't exist or has schema issues, return empty vehicles list
      if (vehiclesError.message.includes('does not exist') || 
          vehiclesError.message.includes('column') ||
          vehiclesError.message.includes('relation')) {
        console.log('⚠️ Vehicles table not available, returning empty list')
        return NextResponse.json({
          success: true,
          vehicles: [],
          count: 0
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch customer vehicles: ' + vehiclesError.message },
        { status: 500 }
      )
    }

    // Get vehicle size pricing information with fallback
    const { data: vehicleSizes, error: sizesError } = await supabase
      .from('vehicle_sizes')
      .select('size_category, base_price_pence, display_name')

    const sizePricing = sizesError ? [] : vehicleSizes
    
    // Fallback pricing if vehicle_sizes table doesn't exist
    const fallbackPricing = {
      small: { base_price_pence: 5000, display_name: 'Small' },
      medium: { base_price_pence: 7500, display_name: 'Medium' },
      large: { base_price_pence: 10000, display_name: 'Large' },
      extra_large: { base_price_pence: 12500, display_name: 'Extra Large' }
    }

    // Enhance vehicles with pricing information
    const enhancedVehicles = (vehicles || []).map(vehicle => {
      // Try to get pricing from database, fallback to hardcoded values
      const sizeInfo = sizePricing.find(s => s.size_category === vehicle.size) ||
                      fallbackPricing[vehicle.size as keyof typeof fallbackPricing] ||
                      fallbackPricing.medium
      
      return {
        ...vehicle,
        size_display_name: sizeInfo?.display_name || vehicle.size,
        base_price_pence: sizeInfo?.base_price_pence || 7500,
        formatted_price: `£${((sizeInfo?.base_price_pence || 7500) / 100).toFixed(2)}`,
        display_name: `${vehicle.make} ${vehicle.model} (${vehicle.registration})`,
        vehicle_description: `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.color ? ` - ${vehicle.color}` : ''}`
      }
    })

    console.log('✅ Customer vehicles fetched successfully:', {
      customerId,
      vehicle_count: enhancedVehicles.length
    })

    return NextResponse.json({
      success: true,
      vehicles: enhancedVehicles,
      count: enhancedVehicles.length
    })

  } catch (error) {
    console.error('❌ Customer vehicles API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}