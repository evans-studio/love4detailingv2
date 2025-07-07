'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { LoadingState } from '@/components/ui/loadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import { 
  Settings, 
  Building2, 
  DollarSign, 
  Clock, 
  Mail, 
  Phone, 
  MapPin,
  Save,
  RefreshCw,
  Users,
  Shield
} from 'lucide-react';

interface BusinessSettings {
  company_name: string;
  email: string;
  phone: string;
  address: string;
  business_hours: {
    monday: { open: string; close: string; enabled: boolean };
    tuesday: { open: string; close: string; enabled: boolean };
    wednesday: { open: string; close: string; enabled: boolean };
    thursday: { open: string; close: string; enabled: boolean };
    friday: { open: string; close: string; enabled: boolean };
    saturday: { open: string; close: string; enabled: boolean };
    sunday: { open: string; close: string; enabled: boolean };
  };
  booking_settings: {
    advance_booking_days: number;
    slot_duration_minutes: number;
    buffer_time_minutes: number;
    cancellation_hours: number;
  };
  pricing_settings: {
    small_base_price: number;
    medium_base_price: number;
    large_base_price: number;
    extra_large_base_price: number;
  };
}

interface SystemSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  booking_confirmations: boolean;
  reminder_emails: boolean;
  admin_notifications: boolean;
  maintenance_mode: boolean;
}

export default function AdminSettings() {
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
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
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    email_notifications: true,
    sms_notifications: false,
    booking_confirmations: true,
    reminder_emails: true,
    admin_notifications: true,
    maintenance_mode: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('business');
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load admin user data to pre-populate business information
      const { data: { user } } = await supabase.auth.getUser();
      let adminUser = null;
      
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (userData && userData.role === 'admin') {
          adminUser = userData;
        }
      }

      const response = await fetch('/api/admin/settings');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      
      const data = await response.json();
      
      if (data.business) {
        setBusinessSettings({
          company_name: data.business.company_name,
          email: data.business.email,
          phone: data.business.phone,
          address: data.business.address,
          business_hours: data.business.business_hours,
          booking_settings: data.business.booking_settings,
          pricing_settings: data.business.pricing_settings,
        });
      } else if (adminUser) {
        // Pre-populate with admin user data if no business settings exist
        setBusinessSettings(prev => ({
          ...prev,
          company_name: adminUser.full_name || prev.company_name,
          email: adminUser.email || prev.email,
          phone: adminUser.phone || prev.phone,
          address: adminUser.address_line1 
            ? `${adminUser.address_line1}${adminUser.address_line2 ? ', ' + adminUser.address_line2 : ''}${adminUser.city ? ', ' + adminUser.city : ''}${adminUser.postcode ? ', ' + adminUser.postcode : ''}` 
            : prev.address
        }));
      }
      
      if (data.system) {
        setSystemSettings(data.system);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      setError('Failed to load settings');
      setLoading(false);
    }
  };

  const saveBusinessSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business: businessSettings
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save settings');
      }
      
      const result = await response.json();
      setSuccess(result.message || 'Business settings saved successfully');
      
      // Auto-clear success message
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving business settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to save business settings');
    } finally {
      setSaving(false);
    }
  };

  const saveSystemSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system: systemSettings
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save system settings');
      }
      
      const result = await response.json();
      setSuccess(result.message || 'System settings saved successfully');
      
      // Auto-clear success message
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving system settings:', error);
      setError(error instanceof Error ? error.message : 'Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const updateBusinessSetting = (key: string, value: any) => {
    setBusinessSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateBusinessHours = (day: string, field: string, value: any) => {
    setBusinessSettings(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours,
        [day]: {
          ...prev.business_hours[day as keyof typeof prev.business_hours],
          [field]: value
        }
      }
    }));
  };

  const updatePricingSetting = (key: string, value: number) => {
    setBusinessSettings(prev => ({
      ...prev,
      pricing_settings: {
        ...prev.pricing_settings,
        [key]: value * 100 // Convert to pence
      }
    }));
  };

  const updateSystemSetting = (key: string, value: boolean) => {
    setSystemSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState>Loading settings...</LoadingState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-[#9146FF]" />
        <div>
          <h1 className="text-2xl font-bold text-[#F2F2F2]">Settings</h1>
          <p className="text-[#C7C7C7]">Configure business and system settings</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="default" className="border-green-200 bg-green-50 text-green-800">
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('business')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'business'
                ? 'border-[#9146FF] text-[#9146FF]'
                : 'border-transparent text-[#C7C7C7] hover:text-[#F2F2F2] hover:border-gray-700'
            }`}
          >
            <Building2 className="h-5 w-5 inline mr-2" />
            Business Settings
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-[#9146FF] text-[#9146FF]'
                : 'border-transparent text-[#C7C7C7] hover:text-[#F2F2F2] hover:border-gray-700'
            }`}
          >
            <Shield className="h-5 w-5 inline mr-2" />
            System Settings
          </button>
        </nav>
      </div>

      {activeTab === 'business' && (
        <div className="space-y-6">
          {/* Company Information */}
          <Card className="p-6 bg-[#1E1E1E] border-gray-800">
            <h2 className="text-lg font-semibold text-[#F2F2F2] mb-4">Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  Company Name
                </label>
                <Input
                  value={businessSettings.company_name}
                  onChange={(e) => updateBusinessSetting('company_name', e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email Address
                </label>
                <Input
                  type="email"
                  value={businessSettings.email}
                  onChange={(e) => updateBusinessSetting('email', e.target.value)}
                  placeholder="Enter business email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Phone Number
                </label>
                <Input
                  value={businessSettings.phone}
                  onChange={(e) => updateBusinessSetting('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Service Area
                </label>
                <Input
                  value={businessSettings.address}
                  onChange={(e) => updateBusinessSetting('address', e.target.value)}
                  placeholder="Enter service area"
                />
              </div>
            </div>
          </Card>

          {/* Business Hours */}
          <Card className="p-6 bg-[#1E1E1E] border-gray-800">
            <h2 className="text-lg font-semibold text-[#F2F2F2] mb-4">
              <Clock className="h-5 w-5 inline mr-2" />
              Business Hours
            </h2>
            <div className="space-y-4">
              {Object.entries(businessSettings.business_hours).map(([day, hours]) => (
                <div key={day} className="grid grid-cols-4 gap-4 items-center">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={hours.enabled}
                      onChange={(e) => updateBusinessHours(day, 'enabled', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-[#C7C7C7] capitalize">
                      {day}
                    </span>
                  </div>
                  <div>
                    <Input
                      type="time"
                      value={hours.open}
                      onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                      disabled={!hours.enabled}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Input
                      type="time"
                      value={hours.close}
                      onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                      disabled={!hours.enabled}
                      className="text-sm"
                    />
                  </div>
                  <div className="text-sm text-[#8B8B8B]">
                    {hours.enabled ? 'Open' : 'Closed'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Booking Settings */}
          <Card className="p-6 bg-[#1E1E1E] border-gray-800">
            <h2 className="text-lg font-semibold text-[#F2F2F2] mb-4">Booking Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  Advance Booking Days
                </label>
                <Input
                  type="number"
                  value={businessSettings.booking_settings.advance_booking_days}
                  onChange={(e) => setBusinessSettings(prev => ({
                    ...prev,
                    booking_settings: {
                      ...prev.booking_settings,
                      advance_booking_days: parseInt(e.target.value) || 0
                    }
                  }))}
                  min="1"
                  max="90"
                />
                <p className="text-xs text-[#8B8B8B] mt-1">How far in advance customers can book</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  Slot Duration (minutes)
                </label>
                <Input
                  type="number"
                  value={businessSettings.booking_settings.slot_duration_minutes}
                  onChange={(e) => setBusinessSettings(prev => ({
                    ...prev,
                    booking_settings: {
                      ...prev.booking_settings,
                      slot_duration_minutes: parseInt(e.target.value) || 0
                    }
                  }))}
                  min="15"
                  max="240"
                  step="15"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  Buffer Time (minutes)
                </label>
                <Input
                  type="number"
                  value={businessSettings.booking_settings.buffer_time_minutes}
                  onChange={(e) => setBusinessSettings(prev => ({
                    ...prev,
                    booking_settings: {
                      ...prev.booking_settings,
                      buffer_time_minutes: parseInt(e.target.value) || 0
                    }
                  }))}
                  min="0"
                  max="60"
                  step="5"
                />
                <p className="text-xs text-[#8B8B8B] mt-1">Time between bookings</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  Cancellation Notice (hours)
                </label>
                <Input
                  type="number"
                  value={businessSettings.booking_settings.cancellation_hours}
                  onChange={(e) => setBusinessSettings(prev => ({
                    ...prev,
                    booking_settings: {
                      ...prev.booking_settings,
                      cancellation_hours: parseInt(e.target.value) || 0
                    }
                  }))}
                  min="1"
                  max="72"
                />
                <p className="text-xs text-[#8B8B8B] mt-1">Minimum notice required to cancel</p>
              </div>
            </div>
          </Card>

          {/* Pricing Settings */}
          <Card className="p-6 bg-[#1E1E1E] border-gray-800">
            <h2 className="text-lg font-semibold text-[#F2F2F2] mb-4">
              <DollarSign className="h-5 w-5 inline mr-2" />
              Base Pricing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  Small Vehicles (£)
                </label>
                <Input
                  type="number"
                  value={(businessSettings.pricing_settings.small_base_price / 100).toFixed(2)}
                  onChange={(e) => updatePricingSetting('small_base_price', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-[#8B8B8B] mt-1">Hatchbacks, small cars</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  Medium Vehicles (£)
                </label>
                <Input
                  type="number"
                  value={(businessSettings.pricing_settings.medium_base_price / 100).toFixed(2)}
                  onChange={(e) => updatePricingSetting('medium_base_price', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-[#8B8B8B] mt-1">Saloons, estates</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  Large Vehicles (£)
                </label>
                <Input
                  type="number"
                  value={(businessSettings.pricing_settings.large_base_price / 100).toFixed(2)}
                  onChange={(e) => updatePricingSetting('large_base_price', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-[#8B8B8B] mt-1">SUVs, MPVs</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#C7C7C7] mb-2">
                  Extra Large (£)
                </label>
                <Input
                  type="number"
                  value={(businessSettings.pricing_settings.extra_large_base_price / 100).toFixed(2)}
                  onChange={(e) => updatePricingSetting('extra_large_base_price', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-[#8B8B8B] mt-1">Vans, trucks</p>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveBusinessSettings} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Business Settings
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Notification Settings */}
          <Card className="p-6 bg-[#1E1E1E] border-gray-800">
            <h2 className="text-lg font-semibold text-[#F2F2F2] mb-4">
              <Mail className="h-5 w-5 inline mr-2" />
              Notification Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#F2F2F2]">Email Notifications</h3>
                  <p className="text-xs text-[#8B8B8B]">Send email notifications to customers</p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.email_notifications}
                  onChange={(e) => updateSystemSetting('email_notifications', e.target.checked)}
                  className="toggle"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#F2F2F2]">SMS Notifications</h3>
                  <p className="text-xs text-[#8B8B8B]">Send SMS notifications to customers</p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.sms_notifications}
                  onChange={(e) => updateSystemSetting('sms_notifications', e.target.checked)}
                  className="toggle"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#F2F2F2]">Booking Confirmations</h3>
                  <p className="text-xs text-[#8B8B8B]">Send confirmation emails for new bookings</p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.booking_confirmations}
                  onChange={(e) => updateSystemSetting('booking_confirmations', e.target.checked)}
                  className="toggle"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#F2F2F2]">Reminder Emails</h3>
                  <p className="text-xs text-[#8B8B8B]">Send reminder emails before appointments</p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.reminder_emails}
                  onChange={(e) => updateSystemSetting('reminder_emails', e.target.checked)}
                  className="toggle"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#F2F2F2]">Admin Notifications</h3>
                  <p className="text-xs text-[#8B8B8B]">Receive notifications for new bookings</p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.admin_notifications}
                  onChange={(e) => updateSystemSetting('admin_notifications', e.target.checked)}
                  className="toggle"
                />
              </div>
            </div>
          </Card>

          {/* System Status */}
          <Card className="p-6 bg-[#1E1E1E] border-gray-800">
            <h2 className="text-lg font-semibold text-[#F2F2F2] mb-4">System Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[#F2F2F2]">Maintenance Mode</h3>
                  <p className="text-xs text-[#8B8B8B]">Temporarily disable new bookings</p>
                </div>
                <input
                  type="checkbox"
                  checked={systemSettings.maintenance_mode}
                  onChange={(e) => updateSystemSetting('maintenance_mode', e.target.checked)}
                  className="toggle"
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveSystemSettings} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save System Settings
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}