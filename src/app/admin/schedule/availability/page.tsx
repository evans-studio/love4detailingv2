'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle,
  Coffee,
  Settings
} from 'lucide-react'

interface AvailabilityOverride {
  id: string
  date: string
  is_available: boolean
  start_time?: string
  end_time?: string
  reason?: string
  notes?: string
  created_at: string
}

interface WorkingDayTemplate {
  day_of_week: number
  day_name: string
  is_working_day: boolean
  start_time?: string
  end_time?: string
  break_start_time?: string
  break_end_time?: string
}

export default function AdminAvailabilityPage() {
  const { user } = useAuth()
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([])
  const [workingDays, setWorkingDays] = useState<WorkingDayTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // New override form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newOverride, setNewOverride] = useState({
    date: '',
    is_available: false,
    start_time: '',
    end_time: '',
    reason: '',
    notes: ''
  })
  
  // Bulk availability controls
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [bulkOperation, setBulkOperation] = useState({
    operation_type: 'weekdays', // 'weekdays', 'weekends', 'date_range'
    is_available: true,
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '17:00',
    reason: '',
    apply_to_existing: false
  })

  useEffect(() => {
    fetchAvailabilityData()
  }, [user?.id])

  const fetchAvailabilityData = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      // Fetch schedule configuration
      const scheduleResponse = await fetch(`/api/admin/schedule?admin_id=${user.id}`)
      if (scheduleResponse.ok) {
        const scheduleData = await scheduleResponse.json()
        if (scheduleData.success) {
          setWorkingDays(scheduleData.schedule || [])
        }
      }

      // Fetch availability overrides (this would be a new endpoint)
      const overridesResponse = await fetch(`/api/admin/schedule/availability?admin_id=${user.id}`)
      if (overridesResponse.ok) {
        const overridesData = await overridesResponse.json()
        if (overridesData.success) {
          setOverrides(overridesData.overrides || [])
        }
      }

    } catch (error) {
      console.error('Error fetching availability data:', error)
      setError('Failed to load availability data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddOverride = async () => {
    if (!user?.id || !newOverride.date) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/admin/schedule/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: user.id,
          ...newOverride
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create availability override')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create override')
      }

      setSuccessMessage('Availability override created successfully')
      setNewOverride({
        date: '',
        is_available: false,
        start_time: '',
        end_time: '',
        reason: '',
        notes: ''
      })
      setShowAddForm(false)
      
      // Refresh data
      await fetchAvailabilityData()

    } catch (error) {
      console.error('Error creating override:', error)
      setError(error instanceof Error ? error.message : 'Failed to create override')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteOverride = async (overrideId: string) => {
    if (!user?.id) return

    try {
      const response = await fetch(`/api/admin/schedule/availability/${overrideId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete override')
      }

      setSuccessMessage('Override deleted successfully')
      await fetchAvailabilityData()

    } catch (error) {
      console.error('Error deleting override:', error)
      setError('Failed to delete override')
    }
  }

  const handleBulkOperation = async () => {
    if (!user?.id) return

    try {
      setSaving(true)
      setError(null)

      // Generate dates based on operation type
      let dates: string[] = []
      const today = new Date()
      const endDate = new Date()
      endDate.setDate(today.getDate() + 90) // Next 90 days

      if (bulkOperation.operation_type === 'weekdays') {
        // Generate weekdays for next 90 days
        for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = d.getDay()
          if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
            dates.push(d.toISOString().split('T')[0])
          }
        }
      } else if (bulkOperation.operation_type === 'weekends') {
        // Generate weekends for next 90 days
        for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dayOfWeek = d.getDay()
          if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
            dates.push(d.toISOString().split('T')[0])
          }
        }
      } else if (bulkOperation.operation_type === 'date_range') {
        // Generate dates in range
        if (bulkOperation.start_date && bulkOperation.end_date) {
          for (let d = new Date(bulkOperation.start_date); d <= new Date(bulkOperation.end_date); d.setDate(d.getDate() + 1)) {
            dates.push(d.toISOString().split('T')[0])
          }
        }
      }

      // Create overrides for each date
      const promises = dates.map(date => 
        fetch('/api/admin/schedule/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_id: user.id,
            date,
            is_available: bulkOperation.is_available,
            start_time: bulkOperation.is_available ? bulkOperation.start_time : null,
            end_time: bulkOperation.is_available ? bulkOperation.end_time : null,
            reason: bulkOperation.reason || `Bulk ${bulkOperation.operation_type} operation`,
            notes: `Applied via bulk operation on ${new Date().toLocaleDateString()}`
          })
        })
      )

      const results = await Promise.allSettled(promises)
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (successful > 0) {
        setSuccessMessage(`Bulk operation completed: ${successful} dates updated${failed > 0 ? `, ${failed} failed` : ''}`)
        setBulkOperation({
          operation_type: 'weekdays',
          is_available: true,
          start_date: '',
          end_date: '',
          start_time: '09:00',
          end_time: '17:00',
          reason: '',
          apply_to_existing: false
        })
        setShowBulkForm(false)
        await fetchAvailabilityData()
      } else {
        setError('Bulk operation failed - no dates were updated')
      }

    } catch (error) {
      console.error('Error with bulk operation:', error)
      setError(error instanceof Error ? error.message : 'Bulk operation failed')
    } finally {
      setSaving(false)
    }
  }

  const getDayAvailability = (date: string) => {
    const override = overrides.find(o => o.date === date)
    if (override) {
      return {
        isAvailable: override.is_available,
        reason: override.reason || 'Custom override',
        isOverride: true
      }
    }

    // Check regular working day schedule
    const dayOfWeek = new Date(date).getDay()
    const workingDay = workingDays.find(wd => wd.day_of_week === dayOfWeek)
    
    return {
      isAvailable: workingDay?.is_working_day || false,
      reason: workingDay?.is_working_day ? 'Regular working day' : 'Non-working day',
      isOverride: false
    }
  }

  const getNext30Days = () => {
    const days = []
    const today = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      days.push(date.toISOString().split('T')[0])
    }
    
    return days
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
  }

  const isToday = (date: string) => {
    return date === new Date().toISOString().split('T')[0]
  }

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  if (isLoading) {
    return (
      <AdminLayout title="Availability Management" subtitle="Manage working hours and special availability">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-400" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Availability Management" subtitle="Manage working hours and special availability">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Availability Management</h1>
            <p className="text-white/60">Override default schedule and manage special availability</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowBulkForm(!showBulkForm)}
              variant="outline"
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Bulk Operations
            </Button>
            
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Override
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="text-red-300">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {successMessage && (
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                <p className="text-green-300">{successMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bulk Operations Form */}
        {showBulkForm && (
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white">Bulk Availability Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-white/80">Operation Type</label>
                  <select
                    value={bulkOperation.operation_type}
                    onChange={(e) => setBulkOperation(prev => ({ ...prev, operation_type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
                  >
                    <option value="weekdays">All Weekdays (Mon-Fri)</option>
                    <option value="weekends">All Weekends (Sat-Sun)</option>
                    <option value="date_range">Custom Date Range</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    checked={bulkOperation.is_available}
                    onCheckedChange={(checked) => setBulkOperation(prev => ({ ...prev, is_available: checked }))}
                  />
                  <span className="text-white/80">Make available for bookings</span>
                </div>

                {bulkOperation.operation_type === 'date_range' && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-white/80">Start Date</label>
                      <Input
                        type="date"
                        value={bulkOperation.start_date}
                        onChange={(e) => setBulkOperation(prev => ({ ...prev, start_date: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-white/80">End Date</label>
                      <Input
                        type="date"
                        value={bulkOperation.end_date}
                        onChange={(e) => setBulkOperation(prev => ({ ...prev, end_date: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white"
                        min={bulkOperation.start_date || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </>
                )}

                {bulkOperation.is_available && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-white/80">Start Time</label>
                      <Input
                        type="time"
                        value={bulkOperation.start_time}
                        onChange={(e) => setBulkOperation(prev => ({ ...prev, start_time: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-white/80">End Time</label>
                      <Input
                        type="time"
                        value={bulkOperation.end_time}
                        onChange={(e) => setBulkOperation(prev => ({ ...prev, end_time: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-white/80">Reason</label>
                  <Input
                    value={bulkOperation.reason}
                    onChange={(e) => setBulkOperation(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g., Holiday hours, Weekend service, Closed for maintenance"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-300 font-medium">Bulk Operation Warning</p>
                    <p className="text-yellow-200/80 text-sm mt-1">
                      This will create availability overrides for {bulkOperation.operation_type === 'weekdays' ? 'all weekdays' : 
                      bulkOperation.operation_type === 'weekends' ? 'all weekends' : 'the selected date range'} in the next 90 days.
                      Existing overrides for these dates will be replaced.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleBulkOperation}
                  disabled={isSaving || (bulkOperation.operation_type === 'date_range' && (!bulkOperation.start_date || !bulkOperation.end_date))}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Apply Bulk Operation
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setShowBulkForm(false)}
                  variant="outline"
                  className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Override Form */}
        {showAddForm && (
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white">Create Availability Override</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-white/80">Date</label>
                  <Input
                    type="date"
                    value={newOverride.date}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, date: e.target.value }))}
                    className="bg-white/10 border-white/20 text-white"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    checked={newOverride.is_available}
                    onCheckedChange={(checked) => setNewOverride(prev => ({ ...prev, is_available: checked }))}
                  />
                  <span className="text-white/80">Available for bookings</span>
                </div>

                {newOverride.is_available && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-white/80">Start Time</label>
                      <Input
                        type="time"
                        value={newOverride.start_time}
                        onChange={(e) => setNewOverride(prev => ({ ...prev, start_time: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-white/80">End Time</label>
                      <Input
                        type="time"
                        value={newOverride.end_time}
                        onChange={(e) => setNewOverride(prev => ({ ...prev, end_time: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm font-medium text-white/80">Reason</label>
                  <Input
                    value={newOverride.reason}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g., Holiday, Special hours, Closed for maintenance"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white/80">Notes</label>
                  <Input
                    value={newOverride.notes}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleAddOverride}
                  disabled={isSaving || !newOverride.date}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Override
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setShowAddForm(false)}
                  variant="outline"
                  className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Overrides */}
        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Active Overrides</CardTitle>
          </CardHeader>
          <CardContent>
            {overrides.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No availability overrides configured</p>
                <p className="text-sm mt-2">Create overrides to modify your default working schedule</p>
              </div>
            ) : (
              <div className="space-y-3">
                {overrides
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((override) => (
                    <div
                      key={override.id}
                      className={`p-4 rounded-lg border transition-all ${
                        override.is_available
                          ? 'bg-green-500/10 border-green-500/20'
                          : 'bg-red-500/10 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-white">{formatDate(override.date)}</h3>
                            {isToday(override.date) && (
                              <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                                Today
                              </Badge>
                            )}
                            <Badge className={
                              override.is_available
                                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                : 'bg-red-500/20 text-red-300 border-red-500/30'
                            }>
                              {override.is_available ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                          
                          {override.is_available && override.start_time && override.end_time && (
                            <p className="text-sm text-white/70">
                              <Clock className="inline h-4 w-4 mr-1" />
                              {override.start_time.slice(0, 5)} - {override.end_time.slice(0, 5)}
                            </p>
                          )}
                          
                          {override.reason && (
                            <p className="text-sm text-white/70 mt-1">
                              <strong>Reason:</strong> {override.reason}
                            </p>
                          )}
                          
                          {override.notes && (
                            <p className="text-sm text-white/60 mt-1">
                              <strong>Notes:</strong> {override.notes}
                            </p>
                          )}
                        </div>

                        <Button
                          onClick={() => handleDeleteOverride(override.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next 30 Days Preview */}
        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white">Next 30 Days Availability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getNext30Days().map((date) => {
                const availability = getDayAvailability(date)
                const todayFlag = isToday(date)
                
                return (
                  <div
                    key={date}
                    className={`p-3 rounded-lg border transition-all ${
                      availability.isAvailable
                        ? 'bg-green-500/10 border-green-500/20'
                        : 'bg-gray-500/10 border-gray-500/20'
                    } ${
                      todayFlag ? 'ring-2 ring-purple-400/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">
                        {new Date(date).toLocaleDateString('en-GB', { 
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                      {todayFlag && (
                        <Badge className="bg-purple-500/20 text-purple-300 text-xs">
                          Today
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={
                        availability.isAvailable
                          ? 'bg-green-500/20 text-green-300 border-green-500/30'
                          : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                      }>
                        {availability.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                      
                      {availability.isOverride && (
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                          Override
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-white/60 mt-1">{availability.reason}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}