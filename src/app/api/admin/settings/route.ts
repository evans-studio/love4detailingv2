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

    // Fetch actual business settings from database
    const [businessHoursRes, businessPoliciesRes, vehicleSizesRes] = await Promise.all([
      supabase
        .from('business_hours')
        .select('*')
        .order('day_of_week'),
      supabase
        .from('business_policies')
        .select('*'),
      supabase
        .from('vehicle_sizes')
        .select('*')
        .order('name')
    ]);

    if (businessHoursRes.error) throw businessHoursRes.error;
    if (businessPoliciesRes.error) throw businessPoliciesRes.error;
    if (vehicleSizesRes.error) throw vehicleSizesRes.error;

    // Transform business hours data
    const businessHours = businessHoursRes.data.reduce((acc, hour) => {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[hour.day_of_week];
      acc[dayName] = {
        open: hour.open_time || '09:00',
        close: hour.close_time || '17:00',
        enabled: hour.is_open
      };
      return acc;
    }, {});

    // Transform business policies data
    const policies = businessPoliciesRes.data.reduce((acc, policy) => {
      acc[policy.policy_key] = policy.policy_value;
      return acc;
    }, {});

    // Transform vehicle sizes for pricing
    const pricingSettings = vehicleSizesRes.data.reduce((acc, size) => {
      const sizeKey = size.name.toLowerCase().replace(' ', '_') + '_base_price';
      acc[sizeKey] = size.base_price_pence;
      return acc;
    }, {});

    const settings = {
      business: {
        company_name: 'Love4Detailing',
        email: 'info@love4detailing.com',
        phone: '+44 7XXX XXXXXX',
        address: 'Mobile Service - Greater London Area',
        business_hours: businessHours,
        booking_settings: {
          advance_booking_days: 30,
          slot_duration_minutes: 60,
          buffer_time_minutes: 15,
          cancellation_hours: policies.cancellation_window_hours?.value || 24,
        },
        pricing_settings: pricingSettings,
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

    // Handle business hours updates
    if (updates.business?.business_hours) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      for (const [dayName, hours] of Object.entries(updates.business.business_hours)) {
        const dayIndex = dayNames.indexOf(dayName);
        if (dayIndex !== -1 && hours && typeof hours === 'object') {
          const hoursData = hours as { enabled: boolean; open: string; close: string };
          const { error } = await supabase
            .from('business_hours')
            .update({
              is_open: hoursData.enabled,
              open_time: hoursData.enabled ? hoursData.open : null,
              close_time: hoursData.enabled ? hoursData.close : null,
            })
            .eq('day_of_week', dayIndex);
          
          if (error) throw error;
        }
      }
    }

    // Handle business policies updates
    if (updates.business?.booking_settings) {
      const { cancellation_hours } = updates.business.booking_settings;
      if (cancellation_hours) {
        const { error } = await supabase
          .from('business_policies')
          .update({
            policy_value: { value: cancellation_hours }
          })
          .eq('policy_key', 'cancellation_window_hours');
        
        if (error) throw error;
      }
    }

    // Handle pricing updates
    if (updates.business?.pricing_settings) {
      const sizeNameMap: Record<string, string> = {
        'small_base_price': 'Small',
        'medium_base_price': 'Medium',
        'large_base_price': 'Large',
        'extra_large_base_price': 'Extra Large'
      };
      
      for (const [priceKey, priceValue] of Object.entries(updates.business.pricing_settings)) {
        const sizeName = sizeNameMap[priceKey];
        if (sizeName && typeof priceValue === 'number') {
          const { error } = await supabase
            .from('vehicle_sizes')
            .update({ base_price_pence: priceValue })
            .eq('name', sizeName);
          
          if (error) throw error;
        }
      }
    }

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