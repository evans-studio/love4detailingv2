'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Clock,
  Calendar,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Activity,
  Coffee,
  Timer
} from 'lucide-react'

interface ScheduleDay {
  day_of_week: number
  day_name: string
  is_working_day: boolean
  start_time: string | null
  end_time: string | null
  max_slots_per_hour: number
  slot_duration_minutes: number
  break_start_time: string | null
  break_end_time: string | null
  updated_at: string
}

interface ScheduleData {
  success: boolean
  schedule: ScheduleDay[]
}

interface ScheduleStatsProps {
  scheduleData: ScheduleData | null
  onRefresh: () => void
}

interface WeeklyStats {
  totalWorkingDays: number
  totalWorkingHours: number
  averageWorkingHours: number
  totalPotentialSlots: number
  averageSlotsPerDay: number
  totalBreakTime: number
  consistencyScore: number
  recommendations: string[]
}

export default function ScheduleStats({ scheduleData, onRefresh }: ScheduleStatsProps) {
  const [stats, setStats] = useState<WeeklyStats | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    calculateStats()
  }, [scheduleData])

  const calculateStats = () => {
    if (!scheduleData?.schedule) {
      setStats(null)
      return
    }

    const workingDays = scheduleData.schedule.filter(day => day.is_working_day)
    const totalWorkingDays = workingDays.length

    let totalWorkingHours = 0
    let totalPotentialSlots = 0
    let totalBreakTime = 0
    let consistencyMetrics: number[] = []
    const recommendations: string[] = []

    workingDays.forEach(day => {
      if (day.start_time && day.end_time) {
        // Calculate working hours
        const start = new Date(`1970-01-01T${day.start_time}`)
        const end = new Date(`1970-01-01T${day.end_time}`)
        let dayHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

        // Subtract break time
        if (day.break_start_time && day.break_end_time) {
          const breakStart = new Date(`1970-01-01T${day.break_start_time}`)
          const breakEnd = new Date(`1970-01-01T${day.break_end_time}`)
          const breakHours = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60)
          totalBreakTime += breakHours
          dayHours = Math.max(0, dayHours - breakHours)
        }

        totalWorkingHours += dayHours

        // Calculate potential slots
        const slotDurationHours = day.slot_duration_minutes / 60
        const daySlots = Math.floor(dayHours / slotDurationHours) * day.max_slots_per_hour
        totalPotentialSlots += daySlots

        // Consistency metrics (for scoring)
        consistencyMetrics.push(dayHours)
      }
    })

    // Calculate consistency score (lower variance = higher consistency)
    const averageHours = totalWorkingHours / totalWorkingDays
    const variance = consistencyMetrics.reduce((acc, hours) => acc + Math.pow(hours - averageHours, 2), 0) / consistencyMetrics.length
    const consistencyScore = Math.max(0, 100 - (variance * 10)) // Convert to 0-100 scale

    // Generate recommendations
    if (totalWorkingDays < 5) {
      recommendations.push(`Consider adding ${5 - totalWorkingDays} more working days to maximize availability`)
    }

    if (averageHours < 6) {
      recommendations.push('Consider extending daily working hours to increase booking capacity')
    }

    if (averageHours > 10) {
      recommendations.push('Consider reducing daily hours to prevent burnout and maintain quality')
    }

    if (consistencyScore < 70) {
      recommendations.push('Consider standardizing working hours across days for better customer expectations')
    }

    if (totalBreakTime / totalWorkingDays < 0.5) {
      recommendations.push('Consider adding adequate break time for better work-life balance')
    }

    const weekendWorkingDays = scheduleData.schedule.filter(day => 
      (day.day_of_week === 0 || day.day_of_week === 6) && day.is_working_day
    ).length

    if (weekendWorkingDays === 0) {
      recommendations.push('Consider weekend availability to capture additional business')
    }

    setStats({
      totalWorkingDays,
      totalWorkingHours,
      averageWorkingHours: totalWorkingHours / totalWorkingDays,
      totalPotentialSlots,
      averageSlotsPerDay: totalPotentialSlots / totalWorkingDays,
      totalBreakTime,
      consistencyScore,
      recommendations
    })
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getConsistencyLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    return 'Needs Improvement'
  }

  if (!stats) {
    return (
      <Card className="bg-gray-800/40 border-purple-500/20">
        <CardContent className="p-6">
          <div className="text-center text-white/60">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No schedule data available</p>
            <p className="text-sm mt-2">Configure your working hours to see statistics</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main Stats Card */}
      <Card className="bg-gray-800/40 border-purple-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-white">Schedule Statistics</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-white/20 text-white/70 hover:text-white hover:border-white/40"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-white/70">Working Days</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">{stats.totalWorkingDays}/7</p>
                  <p className="text-xs text-white/50">days per week</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-white/70">Total Hours</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">{stats.totalWorkingHours.toFixed(1)}h</p>
                  <p className="text-xs text-white/50">per week</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Timer className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-white/70">Avg Daily Hours</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">{stats.averageWorkingHours.toFixed(1)}h</p>
                  <p className="text-xs text-white/50">per working day</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coffee className="h-4 w-4 text-orange-400" />
                  <span className="text-sm text-white/70">Break Time</span>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-white">{stats.totalBreakTime.toFixed(1)}h</p>
                  <p className="text-xs text-white/50">per week total</p>
                </div>
              </div>
            </div>
          </div>

          {/* Capacity Metrics */}
          <div className="border-t border-white/10 pt-4">
            <h4 className="text-sm font-medium text-white/80 mb-3">Booking Capacity</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <p className="text-2xl font-bold text-purple-300">{stats.totalPotentialSlots}</p>
                <p className="text-xs text-white/60">Total Weekly Slots</p>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-2xl font-bold text-blue-300">{stats.averageSlotsPerDay.toFixed(1)}</p>
                <p className="text-xs text-white/60">Avg Slots/Day</p>
              </div>
            </div>
          </div>

          {/* Consistency Score */}
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/70">Schedule Consistency</span>
              <Badge className={`${getConsistencyColor(stats.consistencyScore)} bg-transparent border-current`}>
                {getConsistencyLabel(stats.consistencyScore)}
              </Badge>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  stats.consistencyScore >= 80 ? 'bg-green-500' :
                  stats.consistencyScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${stats.consistencyScore}%` }}
              />
            </div>
            <p className="text-xs text-white/50 mt-1">{stats.consistencyScore.toFixed(0)}% consistency score</p>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Card */}
      {stats.recommendations.length > 0 && (
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-yellow-400" />
              <CardTitle className="text-white text-sm">Optimization Suggestions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-white/80">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-gray-800/40 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-white/20 text-white/70 hover:text-white hover:border-white/40"
              onClick={() => {
                // This would trigger a standard schedule setup
                console.log('Apply standard business hours')
              }}
            >
              <Clock className="h-4 w-4 mr-2" />
              Apply Standard Hours (9-5)
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-white/20 text-white/70 hover:text-white hover:border-white/40"
              onClick={() => {
                // This would optimize for maximum slots
                console.log('Optimize for maximum capacity')
              }}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Optimize for Max Capacity
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}