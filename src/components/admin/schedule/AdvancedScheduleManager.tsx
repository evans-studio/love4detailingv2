'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  Copy, 
  Settings, 
  BarChart3, 
  Download, 
  Upload,
  Filter,
  Search,
  Calendar as CalendarIcon,
  Save,
  RefreshCw,
  PlusCircle,
  Edit3,
  Eye,
  Users,
  TrendingUp,
  Activity
} from 'lucide-react'
import { useScheduleStore } from '@/lib/store'
import { ScheduleErrorBoundary } from '@/components/ErrorBoundary'

interface ScheduleTemplate {
  id: string
  name: string
  description: string
  timeSlots: {
    startTime: string
    duration: number
    maxBookings: number
    isStandard: boolean
    category: 'standard' | 'popular' | 'regular'
  }[]
  isDefault: boolean
  createdAt: string
  usageCount: number
}

interface ScheduleAnalytics {
  totalSlots: number
  availableSlots: number
  bookedSlots: number
  utilizationRate: number
  averageBookingsPerDay: number
  mostPopularTimes: string[]
  weeklyTrends: {
    day: string
    bookings: number
    availability: number
  }[]
}

interface BulkOperationData {
  dateRange: {
    startDate: string
    endDate: string
  }
  operation: 'copy' | 'delete' | 'update'
  templateId?: string
  workingDaysOnly: boolean
}

function AdvancedScheduleManagerContent() {
  const {
    weekOverview,
    selectedDate,
    daySlots,
    isLoading,
    error,
    setSelectedDate,
    loadWeekOverview,
    loadDaySlots,
    toggleWorkingDay,
    addSlot,
    deleteSlot,
  } = useScheduleStore()

  // State for templates
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    timeSlots: [{ startTime: '09:00', duration: 120, maxBookings: 1, isStandard: true, category: 'standard' as const }]
  })

  // State for bulk operations
  const [bulkOperation, setBulkOperation] = useState<BulkOperationData>({
    dateRange: { startDate: '', endDate: '' },
    operation: 'copy',
    templateId: undefined,
    workingDaysOnly: true
  })
  const [isBulkOperationRunning, setIsBulkOperationRunning] = useState(false)

  // State for analytics
  const [analytics, setAnalytics] = useState<ScheduleAnalytics | null>(null)
  const [analyticsDateRange, setAnalyticsDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  // State for filtering and search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'booked' | 'unavailable'>('all')
  const [dateFilter, setDateFilter] = useState('')

  // Load initial data
  useEffect(() => {
    loadWeekOverview()
    loadTemplates()
    loadAnalytics()
  }, [loadWeekOverview])

  // Load templates
  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/schedule/templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  // Load analytics
  const loadAnalytics = async () => {
    try {
      const params = new URLSearchParams()
      if (analyticsDateRange.startDate) params.append('startDate', analyticsDateRange.startDate)
      if (analyticsDateRange.endDate) params.append('endDate', analyticsDateRange.endDate)
      
      const response = await fetch(`/api/admin/schedule/analytics?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }

  // Create template
  const handleCreateTemplate = async () => {
    setIsCreatingTemplate(true)
    try {
      const response = await fetch('/api/admin/schedule/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm)
      })
      
      if (response.ok) {
        await loadTemplates()
        setTemplateForm({
          name: '',
          description: '',
          timeSlots: [{ startTime: '09:00', duration: 120, maxBookings: 1, isStandard: true, category: 'standard' }]
        })
      }
    } catch (error) {
      console.error('Failed to create template:', error)
    } finally {
      setIsCreatingTemplate(false)
    }
  }

  // Apply template to date range
  const handleApplyTemplate = async (templateId: string, dateRange: { startDate: string, endDate: string }) => {
    try {
      const response = await fetch('/api/admin/schedule/apply-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          dateRange,
          workingDaysOnly: bulkOperation.workingDaysOnly
        })
      })
      
      if (response.ok) {
        await loadWeekOverview()
        if (selectedDate) {
          await loadDaySlots(selectedDate)
        }
      }
    } catch (error) {
      console.error('Failed to apply template:', error)
    }
  }

  // Handle bulk operations
  const handleBulkOperation = async () => {
    setIsBulkOperationRunning(true)
    try {
      const response = await fetch('/api/admin/schedule/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkOperation)
      })
      
      if (response.ok) {
        await loadWeekOverview()
        if (selectedDate) {
          await loadDaySlots(selectedDate)
        }
      }
    } catch (error) {
      console.error('Failed to perform bulk operation:', error)
    } finally {
      setIsBulkOperationRunning(false)
    }
  }

  // Filter and search slots
  const filteredSlots = daySlots.filter(slot => {
    const matchesSearch = searchQuery === '' || 
      slot.start_time.includes(searchQuery) ||
      slot.end_time.includes(searchQuery)
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'available' && slot.is_available) ||
      (statusFilter === 'booked' && !slot.is_available)
    
    return matchesSearch && matchesStatus
  })

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading && weekOverview.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Loading schedule...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Advanced Schedule Management</h1>
          <p className="text-muted-foreground">
            Comprehensive schedule management with templates, bulk operations, and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => loadWeekOverview()}
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-destructive/50 bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="bulk-operations">Bulk Operations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          {/* Week Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Week Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {weekOverview.map((day) => (
                  <div
                    key={day.day_date}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedDate === day.day_date
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedDate(day.day_date)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-foreground">{day.day_name}</div>
                      <Switch
                        checked={day.is_working_day}
                        onCheckedChange={(checked) => toggleWorkingDay(day.day_date, checked)}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {formatDate(day.day_date)}
                    </div>
                    {day.is_working_day ? (
                      <div className="space-y-1">
                        <Badge variant="outline">
                          {day.available_slots}/{day.total_slots} available
                        </Badge>
                        {day.booked_slots > 0 && (
                          <Badge variant="default">
                            {day.booked_slots} booked
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="secondary">
                        Not working
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Day Details */}
          {selectedDate && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Slots List */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Time Slots - {formatDate(selectedDate)}</CardTitle>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search slots..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-32"
                        />
                      </div>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="booked">Booked</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredSlots.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No time slots found</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredSlots.map((slot) => (
                        <div
                          key={slot.slot_id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="font-medium">
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {slot.duration_minutes} min • Max {slot.max_bookings} bookings
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={slot.is_available ? "default" : "secondary"}>
                                {slot.is_available ? 'Available' : 'Fully booked'}
                              </Badge>
                              {slot.current_bookings > 0 && (
                                <Badge variant="outline">
                                  {slot.current_bookings} booked
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" onClick={() => {}}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Time Slot
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Day
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Day
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Day Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Templates List */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{template.name}</h3>
                        <div className="flex items-center gap-2">
                          {template.isDefault && (
                            <Badge variant="default">Default</Badge>
                          )}
                          <Badge variant="outline">
                            {template.timeSlots.length} slots
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Used {template.usageCount} times</span>
                        <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Create Template */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Template</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template Name</Label>
                    <Input
                      placeholder="e.g., Standard Weekday"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Template description"
                      value={templateForm.description}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Slots</Label>
                    {templateForm.timeSlots.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <Input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => {
                            const newSlots = [...templateForm.timeSlots]
                            newSlots[index].startTime = e.target.value
                            setTemplateForm(prev => ({ ...prev, timeSlots: newSlots }))
                          }}
                        />
                        <Input
                          type="number"
                          placeholder="Duration"
                          value={slot.duration}
                          onChange={(e) => {
                            const newSlots = [...templateForm.timeSlots]
                            newSlots[index].duration = parseInt(e.target.value)
                            setTemplateForm(prev => ({ ...prev, timeSlots: newSlots }))
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newSlots = templateForm.timeSlots.filter((_, i) => i !== index)
                            setTemplateForm(prev => ({ ...prev, timeSlots: newSlots }))
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTemplateForm(prev => ({
                          ...prev,
                          timeSlots: [...prev.timeSlots, { startTime: '09:00', duration: 120, maxBookings: 1, isStandard: true, category: 'standard' }]
                        }))
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Time Slot
                    </Button>
                  </div>
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={isCreatingTemplate || !templateForm.name}
                    className="w-full"
                  >
                    {isCreatingTemplate ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Create Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk-operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={bulkOperation.dateRange.startDate}
                      onChange={(e) => setBulkOperation(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, startDate: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={bulkOperation.dateRange.endDate}
                      onChange={(e) => setBulkOperation(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, endDate: e.target.value }
                      }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Operation</Label>
                  <select
                    value={bulkOperation.operation}
                    onChange={(e) => setBulkOperation(prev => ({ ...prev, operation: e.target.value as any }))}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="copy">Copy from template</option>
                    <option value="delete">Delete slots</option>
                    <option value="update">Update slots</option>
                  </select>
                </div>
                {bulkOperation.operation === 'copy' && (
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <select
                      value={bulkOperation.templateId || ''}
                      onChange={(e) => setBulkOperation(prev => ({ ...prev, templateId: e.target.value }))}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select template</option>
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={bulkOperation.workingDaysOnly}
                    onCheckedChange={(checked) => setBulkOperation(prev => ({ ...prev, workingDaysOnly: checked }))}
                  />
                  <Label>Working days only</Label>
                </div>
                <Button
                  onClick={handleBulkOperation}
                  disabled={isBulkOperationRunning}
                  className="w-full"
                >
                  {isBulkOperationRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Activity className="h-4 w-4 mr-2" />
                  )}
                  Execute Bulk Operation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analytics && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalSlots}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{analytics.availableSlots}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Booked Slots</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">{analytics.bookedSlots}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Utilization Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{analytics.utilizationRate}%</div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function AdvancedScheduleManager() {
  return (
    <ScheduleErrorBoundary>
      <AdvancedScheduleManagerContent />
    </ScheduleErrorBoundary>
  )
}