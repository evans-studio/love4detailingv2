import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import vehicleSizeData from '@/data/vehicle-size-data.json'

interface VehicleDataEntry {
  make: string
  model: string
  trim: string
  size: string
}

// Map JSON size codes to database enum values
const sizeMapping: Record<string, 'small' | 'medium' | 'large' | 'extra_large'> = {
  'S': 'small',
  'M': 'medium', 
  'L': 'large',
  'XL': 'extra_large'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase()
    
    // Verify admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || !userProfile.role || !['admin', 'super_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Process vehicle data and import to database
    const importResults = {
      total: vehicleSizeData.length,
      imported: 0,
      updated: 0,
      errors: [] as string[]
    }

    // Process in batches to avoid overwhelming the database
    const batchSize = 100
    for (let i = 0; i < vehicleSizeData.length; i += batchSize) {
      const batch = vehicleSizeData.slice(i, i + batchSize)
      
      for (const vehicle of batch as VehicleDataEntry[]) {
        try {
          const dbSize = sizeMapping[vehicle.size] || 'medium'
          const trimValue = vehicle.trim?.trim() || undefined
          
          // Use upsert to insert or update
          const { error } = await supabase
            .from('vehicle_model_registry')
            .upsert({
              make: vehicle.make.trim(),
              model: vehicle.model.trim(),
              trim: trimValue,
              default_size: dbSize,
              verified: true
            } as any)

          if (error) {
            importResults.errors.push(`${vehicle.make} ${vehicle.model}: ${error.message}`)
          } else {
            importResults.imported++
          }
        } catch (err) {
          importResults.errors.push(`${vehicle.make} ${vehicle.model}: ${err}`)
        }
      }
    }

    // Update statistics  
    const { count } = await supabase
      .from('vehicle_model_registry')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      message: `Imported ${importResults.imported} vehicle entries`,
      results: importResults,
      total_in_registry: count || 0
    })

  } catch (error) {
    console.error('Vehicle import error:', error)
    return NextResponse.json(
      { error: 'Failed to import vehicle data' },
      { status: 500 }
    )
  }
} 