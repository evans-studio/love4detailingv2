'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import AdminLayout from '@/components/admin/layout/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Clock,
  Calendar,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Settings,
  AlertCircle
} from 'lucide-react'

interface TimeSlot {
  id: string
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  is_booked: boolean
  booking_id?: string
  booking_reference?: string
  customer_name?: string
  service_name?: string
  created_at: string
  updated_at: string
}

export default function AdminSlotsPage() {
  const { user } = useAuth()
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [filteredSlots, setFilteredSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('upcoming')
  const [selectedWeek, setSelectedWeek] = useState(new Date())

  useEffect(() => {
    fetchSlots()
  }, [user?.id, selectedWeek])

  useEffect(() => {
    filterSlots()
  }, [slots, searchTerm, statusFilter, dateFilter])

  const fetchSlots = async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      // Get start and end dates for the selected week
      const startDate = getWeekStart(selectedWeek)
      const endDate = getWeekEnd(selectedWeek)

      const response = await fetch(
        `/api/admin/schedule/slots?start_date=${startDate}&end_date=${endDate}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch time slots')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch time slots')
      }

      setSlots(result.slots || [])

    } catch (error) {
      console.error('Error fetching slots:', error)
      setError(error instanceof Error ? error.message : 'Failed to load time slots')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const filterSlots = () => {
    let filtered = [...slots]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(slot =>
        slot.booking_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.service_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(slot => {
        switch (statusFilter) {
          case 'available':
            return slot.is_available && !slot.is_booked
          case 'booked':
            return slot.is_booked
          case 'unavailable':
            return !slot.is_available
          default:
            return true
        }
      })
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date()
      filtered = filtered.filter(slot => {
        const slotDate = new Date(slot.date)
        switch (dateFilter) {
          case 'today':
            return slotDate.toDateString() === today.toDateString()
          case 'upcoming':
            return slotDate >= today
          case 'past':
            return slotDate < today
          default:
            return true
        }
      })
    }

    setFilteredSlots(filtered)
  }

  const getWeekStart = (date: Date) => {
    const start = new Date(date)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Monday
    start.setDate(diff)
    return start.toISOString().split('T')[0]
  }

  const getWeekEnd = (date: Date) => {
    const end = new Date(date)
    const day = end.getDay()
    const diff = end.getDate() - day + (day === 0 ? 0 : 7) // Sunday
    end.setDate(diff)
    return end.toISOString().split('T')[0]
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchSlots()
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(selectedWeek)
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7))
    setSelectedWeek(newWeek)
  }

  const getSlotStatusBadge = (slot: TimeSlot) => {
    if (slot.is_booked) {
      return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Booked</Badge>
    }
    if (slot.is_available) {
      return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Available</Badge>
    }
    return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">Unavailable</Badge>
  }

  const formatTime = (timeString: string) => {
    return timeString?.slice(0, 5) || '00:00'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  const getDaySlots = (date: string) => {
    return filteredSlots.filter(slot => slot.date === date)
  }

  const getWeekDates = () => {
    const dates = []
    const start = new Date(getWeekStart(selectedWeek))
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    
    return dates
  }

  return (
    <AdminLayout title="Time Slots Management" subtitle="Manage individual time slots and availability">
      <div className="p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Time Slots Management</h1>
            <p className="text-white/60">View and manage individual time slots</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Generate Slots
            </Button>
          </div>
        </div>

        {/* Week Navigation */}
        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => navigateWeek('prev')}
                className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
              >
                Previous Week
              </Button>
              
              <div className="text-center">
                <h3 className="font-semibold text-white">
                  Week of {formatDate(getWeekStart(selectedWeek))}
                </h3>
                <p className="text-sm text-white/60">
                  {getWeekStart(selectedWeek)} - {getWeekEnd(selectedWeek)}
                </p>
              </div>
              
              <Button 
                variant="outline"
                onClick={() => navigateWeek('next')}
                className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
              >
                Next Week
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="bg-gray-800/40 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                  <Input
                    placeholder="Search slots..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="booked">Booked</option>
                  <option value="unavailable">Unavailable</option>
                </select>
                
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white text-sm"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
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

        {/* Weekly Grid View */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {getWeekDates().map((date) => {
            const daySlots = getDaySlots(date)
            const isToday = date === new Date().toISOString().split('T')[0]
            
            return (
              <Card 
                key={date} 
                className={`bg-gray-800/40 border-purple-500/20 ${
                  isToday ? 'ring-2 ring-purple-400/50' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-white">
                    {formatDate(date)}
                    {isToday && (
                      <Badge className="ml-2 bg-purple-500/20 text-purple-300 text-xs">
                        Today
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-2">
                  {daySlots.length === 0 ? (
                    <div className="text-center py-4 text-white/50">
                      <Clock className="h-6 w-6 mx-auto mb-2" />
                      <p className="text-xs">No slots</p>
                    </div>
                  ) : (
                    daySlots
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((slot) => (
                        <div
                          key={slot.id}
                          className={`p-3 rounded-lg border transition-all ${
                            slot.is_booked
                              ? 'bg-blue-500/10 border-blue-500/20'
                              : slot.is_available
                              ? 'bg-green-500/10 border-green-500/20'
                              : 'bg-gray-500/10 border-gray-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </span>
                            {getSlotStatusBadge(slot)}
                          </div>
                          
                          {slot.is_booked && (
                            <div className="text-xs text-white/70">
                              <p className="font-medium">{slot.customer_name}</p>
                              <p>{slot.booking_reference}</p>
                              <p>{slot.service_name}</p>
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-white">{filteredSlots.length}</p>
              <p className="text-xs text-white/60">Total Slots</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-white">
                {filteredSlots.filter(s => s.is_available && !s.is_booked).length}
              </p>
              <p className="text-xs text-white/60">Available</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <Calendar className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-white">
                {filteredSlots.filter(s => s.is_booked).length}
              </p>
              <p className="text-xs text-white/60">Booked</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/40 border-purple-500/20">
            <CardContent className="p-4 text-center">
              <XCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
              <p className="text-lg font-bold text-white">
                {filteredSlots.filter(s => !s.is_available).length}
              </p>
              <p className="text-xs text-white/60">Unavailable</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}