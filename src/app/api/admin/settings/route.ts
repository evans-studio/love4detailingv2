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

    // Fetch actual business settings from database with fallbacks
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
        .order('label')
    ]);

    // Handle errors gracefully with fallbacks
    let businessHours = {};
    let policies = {};
    let pricingSettings = {};

    // Default business hours if table doesn't exist or has errors
    if (businessHoursRes.error || !businessHoursRes.data) {
      console.warn('Business hours table not found or error:', businessHoursRes.error);
      businessHours = {
        monday: { open: '08:00', close: '18:00', enabled: true },
        tuesday: { open: '08:00', close: '18:00', enabled: true },
        wednesday: { open: '08:00', close: '18:00', enabled: true },
        thursday: { open: '08:00', close: '18:00', enabled: true },
        friday: { open: '08:00', close: '18:00', enabled: true },
        saturday: { open: '09:00', close: '17:00', enabled: true },
        sunday: { open: '10:00', close: '16:00', enabled: false },
      };
    } else {
      // Transform business hours data
      businessHours = businessHoursRes.data.reduce((acc, hour) => {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[hour.day_of_week];
        acc[dayName] = {
          open: hour.open_time || '09:00',
          close: hour.close_time || '17:00',
          enabled: hour.is_open
        };
        return acc;
      }, {});
    }

    // Default policies if table doesn't exist or has errors
    if (businessPoliciesRes.error || !businessPoliciesRes.data) {
      console.warn('Business policies table not found or error:', businessPoliciesRes.error);
      policies = { cancellation_window_hours: { value: 24 } };
    } else {
      // Transform business policies data
      policies = businessPoliciesRes.data.reduce((acc, policy) => {
        acc[policy.policy_key] = policy.policy_value;
        return acc;
      }, {});
    }

    // Default pricing if table has errors
    if (vehicleSizesRes.error || !vehicleSizesRes.data) {
      console.warn('Vehicle sizes table not found or error:', vehicleSizesRes.error);
      pricingSettings = {
        small_base_price: 2500,
        medium_base_price: 3500,
        large_base_price: 4500,
        extra_large_base_price: 5500,
      };
    } else {
      // Transform vehicle sizes for pricing
      pricingSettings = vehicleSizesRes.data.reduce((acc, size) => {
        const sizeKey = size.label.toLowerCase().replace(' ', '_') + '_base_price';
        acc[sizeKey] = size.price_pence;
        return acc;
      }, {});
    }


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
          cancellation_hours: (policies as any).cancellation_window_hours?.value || 24,
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

    // Handle business hours updates (only if table exists)
    if (updates.business?.business_hours) {
      const { data: tableExists } = await supabase
        .from('business_hours')
        .select('id')
        .limit(1);
      
      if (tableExists) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        for (const [dayName, hours] of Object.entries(updates.business.business_hours)) {
          const dayIndex = dayNames.indexOf(dayName);
          if (dayIndex !== -1 && hours && typeof hours === 'object') {
            const hoursData = hours as { enabled: boolean; open: string; close: string };
            const { error } = await supabase
              .from('business_hours')
              .upsert({
                day_of_week: dayIndex,
                is_open: hoursData.enabled,
                open_time: hoursData.enabled ? hoursData.open : null,
                close_time: hoursData.enabled ? hoursData.close : null,
              }, {
                onConflict: 'day_of_week'
              });
            
            if (error) {
              console.warn('Failed to update business hours:', error);
            }
          }
        }
      } else {
        console.warn('Business hours table does not exist, skipping update');
      }
    }

    // Handle business policies updates (only if table exists)
    if (updates.business?.booking_settings) {
      const { data: tableExists } = await supabase
        .from('business_policies')
        .select('id')
        .limit(1);
        
      if (tableExists) {
        const { cancellation_hours } = updates.business.booking_settings;
        if (cancellation_hours) {
          const { error } = await supabase
            .from('business_policies')
            .upsert({
              policy_key: 'cancellation_window_hours',
              policy_value: { value: cancellation_hours },
              description: 'Hours before booking that cancellation is allowed without penalty'
            }, {
              onConflict: 'policy_key'
            });
          
          if (error) {
            console.warn('Failed to update business policies:', error);
          }
        }
      } else {
        console.warn('Business policies table does not exist, skipping update');
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
            .update({ price_pence: priceValue })
            .eq('label', sizeName);
          
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