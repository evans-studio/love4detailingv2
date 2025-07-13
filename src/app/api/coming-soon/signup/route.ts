import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role for database operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Extract additional tracking data
    const ipAddress = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || null
    const userAgent = request.headers.get('user-agent') || null
    const referrer = request.headers.get('referer') || null
    
    // Extract UTM parameters from referrer if available
    const url = new URL(request.url)
    const utmSource = url.searchParams.get('utm_source')
    const utmMedium = url.searchParams.get('utm_medium')
    const utmCampaign = url.searchParams.get('utm_campaign')

    // Call the stored function to create signup
    const { data, error } = await supabase.rpc('create_coming_soon_signup', {
      p_email: email,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_referrer: referrer,
      p_utm_source: utmSource,
      p_utm_medium: utmMedium,
      p_utm_campaign: utmCampaign
    })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { success: false, message: 'Database error occurred' },
        { status: 500 }
      )
    }

    if (!data.success) {
      return NextResponse.json(
        { success: false, message: data.error },
        { status: 400 }
      )
    }

    // Log successful signup
    console.log('✅ Coming soon signup:', {
      email: email,
      ip: ipAddress,
      referrer: referrer,
      utmSource: utmSource,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Thank you for signing up! We\'ll notify you when we launch.',
      signup_id: data.signup_id
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin for accessing stats
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get signup statistics
    const { data, error } = await supabase.rpc('get_coming_soon_stats')

    if (error) {
      console.error('Stats error:', error)
      return NextResponse.json(
        { success: false, message: 'Failed to get stats' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      stats: data
    })

  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}