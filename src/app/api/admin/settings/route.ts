import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // For now, return default settings
    // In a real implementation, you'd fetch from a settings table
    const settings = {
      business: {
        company_name: 'Love4Detailing',
        email: 'info@love4detailing.com',
        phone: '+44 7XXX XXXXXX',
        address: 'Mobile Service - Greater London Area',
        business_hours: {
          monday: { open: '08:00', close: '18:00', enabled: true },
          tuesday: { open: '08:00', close: '18:00', enabled: true },
          wednesday: { open: '08:00', close: '18:00', enabled: true },
          thursday: { open: '08:00', close: '18:00', enabled: true },
          friday: { open: '08:00', close: '18:00', enabled: true },
          saturday: { open: '09:00', close: '17:00', enabled: true },
          sunday: { open: '10:00', close: '16:00', enabled: false },
        },
        booking_settings: {
          advance_booking_days: 30,
          slot_duration_minutes: 60,
          buffer_time_minutes: 15,
          cancellation_hours: 24,
        },
        pricing_settings: {
          small_base_price: 2500, // £25.00 in pence
          medium_base_price: 3500, // £35.00 in pence
          large_base_price: 4500, // £45.00 in pence
          extra_large_base_price: 5500, // £55.00 in pence
        },
      },
      system: {
        email_notifications: true,
        sms_notifications: false,
        booking_confirmations: true,
        reminder_emails: true,
        admin_notifications: true,
        maintenance_mode: false,
      }
    };

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const updates = await request.json();

    // Check admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // In a real implementation, you'd save to a database
    // For now, we'll simulate the save operation
    console.log('Settings update:', updates);

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}