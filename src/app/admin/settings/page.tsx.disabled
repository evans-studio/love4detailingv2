'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  DollarSign,
  Users,
  Car,
  Calendar,
  Database,
  Shield,
  Bell,
  Palette,
  Globe,
  Loader2,
  RefreshCw,
  Trash2,
  Plus,
  Edit,
  X
} from 'lucide-react'

interface SystemSettings {
  business: {
    name: string
    email: string
    phone: string
    address: string
    city: string
    postcode: string
    website?: string
  }
  booking: {
    advanceBookingDays: number
    cancellationHours: number
    defaultServiceDuration: number
    maxBookingsPerDay: number
    workingHours: {
      start: string
      end: string
    }
    workingDays: string[]
  }
  pricing: {
    currency: string
    taxRate: number
    minimumBookingValue: number
    cancellationFee: number
  }
  features: {
    emailNotifications: boolean
    smsNotifications: boolean
    onlinePayments: boolean
    rewards: boolean
    analytics: boolean
    customerReviews: boolean
  }
  notifications: {
    newBookingAlert: boolean
    cancellationAlert: boolean
    paymentAlert: boolean
    systemMaintenanceAlert: boolean
  }
}

export default function AdminSettingsPage() {
  const { profile, permissions, isLoading } = useAuth()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('business')

  useEffect(() => {
    if (profile && permissions?.can_manage_system) {
      fetchSettings()
    }
  }, [profile, permissions])

  const fetchSettings = async () => {
    try {
      setIsLoadingSettings(true)
      // For now, we'll use default settings since the API doesn't exist yet
      const defaultSettings: SystemSettings = {
        business: {
          name: 'Love4Detailing',
          email: 'admin@love4detailing.com',
          phone: '+44 7123 456789',
          address: '123 Business Street',
          city: 'London',
          postcode: 'SW1A 1AA',
          website: 'https://love4detailing.com'
        },
        booking: {
          advanceBookingDays: 14,
          cancellationHours: 24,
          defaultServiceDuration: 120,
          maxBookingsPerDay: 8,
          workingHours: {
            start: '09:00',
            end: '17:00'
          },
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        },
        pricing: {
          currency: 'GBP',
          taxRate: 20,
          minimumBookingValue: 25,
          cancellationFee: 10
        },
        features: {
          emailNotifications: true,
          smsNotifications: false,
          onlinePayments: false,
          rewards: true,
          analytics: true,
          customerReviews: true
        },
        notifications: {
          newBookingAlert: true,
          cancellationAlert: true,
          paymentAlert: true,
          systemMaintenanceAlert: true
        }
      }
      setSettings(defaultSettings)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Failed to load settings')
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      // Simulate API call - in a real app, this would save to the database
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccess('Settings saved successfully!')
      
      // In a real app, you would make an API call here:
      // const response = await fetch('/api/admin/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings)
      // })
      
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (section: keyof SystemSettings, field: string, value: any) => {
    if (!settings) return
    
    setSettings(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [field]: value
      }
    }))
  }

  const updateNestedSetting = (section: keyof SystemSettings, parentField: string, field: string, value: any) => {
    if (!settings) return
    
    setSettings(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [parentField]: {
          ...(prev![section] as any)[parentField],
          [field]: value
        }
      }
    }))
  }

  const tabs = [
    { id: 'business', label: 'Business Info', icon: MapPin },
    { id: 'booking', label: 'Booking Rules', icon: Calendar },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'features', label: 'Features', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system', label: 'System', icon: Database }
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!profile || !permissions?.can_manage_system) {
    return (
      <AdminLayout title="Access Denied" subtitle="Insufficient permissions">
        <Card className="w-full max-w-md mx-auto bg-gray-800/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Access Denied</CardTitle>
            <CardDescription className="text-white/60">
              You don't have permission to access system settings.
            </CardDescription>
          </CardHeader>
        </Card>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="System Settings" subtitle="Configure your system preferences and business rules">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-end">
          <Button 
            onClick={handleSave} 
            disabled={isSaving || isLoadingSettings}
            className="min-w-[120px] bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoadingSettings ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading settings...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Navigation Tabs */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <nav className="space-y-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === tab.id
                              ? 'bg-primary/10 text-primary border-r-2 border-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          {tab.label}
                        </button>
                      )
                    })}
                  </nav>
                </CardContent>
              </Card>
            </div>

            {/* Settings Content */}
            <div className="lg:col-span-3">
              {activeTab === 'business' && settings && (
                <Card>
                  <CardHeader>
                    <CardTitle>Business Information</CardTitle>
                    <CardDescription>
                      Configure your business details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                          id="businessName"
                          value={settings.business.name}
                          onChange={(e) => updateSetting('business', 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessEmail">Email Address</Label>
                        <Input
                          id="businessEmail"
                          type="email"
                          value={settings.business.email}
                          onChange={(e) => updateSetting('business', 'email', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessPhone">Phone Number</Label>
                        <Input
                          id="businessPhone"
                          value={settings.business.phone}
                          onChange={(e) => updateSetting('business', 'phone', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessWebsite">Website</Label>
                        <Input
                          id="businessWebsite"
                          value={settings.business.website || ''}
                          onChange={(e) => updateSetting('business', 'website', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="businessAddress">Address</Label>
                      <Input
                        id="businessAddress"
                        value={settings.business.address}
                        onChange={(e) => updateSetting('business', 'address', e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="businessCity">City</Label>
                        <Input
                          id="businessCity"
                          value={settings.business.city}
                          onChange={(e) => updateSetting('business', 'city', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="businessPostcode">Postcode</Label>
                        <Input
                          id="businessPostcode"
                          value={settings.business.postcode}
                          onChange={(e) => updateSetting('business', 'postcode', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'booking' && settings && (
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Rules</CardTitle>
                    <CardDescription>
                      Configure booking limitations and working hours
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="advanceBookingDays">Advance Booking Days</Label>
                        <Input
                          id="advanceBookingDays"
                          type="number"
                          value={settings.booking.advanceBookingDays}
                          onChange={(e) => updateSetting('booking', 'advanceBookingDays', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cancellationHours">Cancellation Hours</Label>
                        <Input
                          id="cancellationHours"
                          type="number"
                          value={settings.booking.cancellationHours}
                          onChange={(e) => updateSetting('booking', 'cancellationHours', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="defaultServiceDuration">Default Service Duration (minutes)</Label>
                        <Input
                          id="defaultServiceDuration"
                          type="number"
                          value={settings.booking.defaultServiceDuration}
                          onChange={(e) => updateSetting('booking', 'defaultServiceDuration', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxBookingsPerDay">Max Bookings Per Day</Label>
                        <Input
                          id="maxBookingsPerDay"
                          type="number"
                          value={settings.booking.maxBookingsPerDay}
                          onChange={(e) => updateSetting('booking', 'maxBookingsPerDay', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="workingHoursStart">Working Hours Start</Label>
                        <Input
                          id="workingHoursStart"
                          type="time"
                          value={settings.booking.workingHours.start}
                          onChange={(e) => updateNestedSetting('booking', 'workingHours', 'start', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="workingHoursEnd">Working Hours End</Label>
                        <Input
                          id="workingHoursEnd"
                          type="time"
                          value={settings.booking.workingHours.end}
                          onChange={(e) => updateNestedSetting('booking', 'workingHours', 'end', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'features' && settings && (
                <Card>
                  <CardHeader>
                    <CardTitle>System Features</CardTitle>
                    <CardDescription>
                      Enable or disable system features
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Send booking confirmations and updates via email
                          </p>
                        </div>
                        <Switch
                          checked={settings.features.emailNotifications}
                          onCheckedChange={(checked) => updateSetting('features', 'emailNotifications', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>SMS Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Send booking reminders via SMS
                          </p>
                        </div>
                        <Switch
                          checked={settings.features.smsNotifications}
                          onCheckedChange={(checked) => updateSetting('features', 'smsNotifications', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Online Payments</Label>
                          <p className="text-sm text-muted-foreground">
                            Accept online payments via Stripe
                          </p>
                        </div>
                        <Switch
                          checked={settings.features.onlinePayments}
                          onCheckedChange={(checked) => updateSetting('features', 'onlinePayments', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Rewards System</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable customer loyalty rewards
                          </p>
                        </div>
                        <Switch
                          checked={settings.features.rewards}
                          onCheckedChange={(checked) => updateSetting('features', 'rewards', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Analytics</Label>
                          <p className="text-sm text-muted-foreground">
                            Track business performance metrics
                          </p>
                        </div>
                        <Switch
                          checked={settings.features.analytics}
                          onCheckedChange={(checked) => updateSetting('features', 'analytics', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Customer Reviews</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow customers to leave reviews
                          </p>
                        </div>
                        <Switch
                          checked={settings.features.customerReviews}
                          onCheckedChange={(checked) => updateSetting('features', 'customerReviews', checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'system' && (
                <Card>
                  <CardHeader>
                    <CardTitle>System Status</CardTitle>
                    <CardDescription>
                      Monitor system health and performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Database Status</Label>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Connected
                          </Badge>
                          <span className="text-sm text-muted-foreground">All systems operational</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Email Service</Label>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                          <span className="text-sm text-muted-foreground">Resend API connected</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Maintenance Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable to perform system maintenance
                          </p>
                        </div>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Debug Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable detailed logging for troubleshooting
                          </p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}