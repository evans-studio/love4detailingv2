/**
 * User Activity Tracking and Session Logging Service
 * Tracks user interactions, page views, and session activities
 */

import { auditLogger } from './audit-logger'
import { log } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase/client'

export interface ActivityEvent {
  type: 'page_view' | 'click' | 'form_submit' | 'search' | 'booking' | 'payment' | 'login' | 'logout' | 'session_start' | 'session_end' | 'error' | 'custom'
  category: 'navigation' | 'interaction' | 'transaction' | 'auth' | 'system' | 'custom'
  action: string
  label?: string
  value?: number
  data?: Record<string, any>
  url?: string
  referrer?: string
  timestamp?: Date
}

export interface SessionMetrics {
  sessionId: string
  startTime: Date
  endTime?: Date
  duration?: number
  pageViews: number
  interactions: number
  bounceRate: number
  userAgent: string
  ipAddress: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  browserInfo: {
    name: string
    version: string
    os: string
  }
  location?: {
    country?: string
    region?: string
    city?: string
  }
}

export interface UserActivityStats {
  userId: string
  totalSessions: number
  totalPageViews: number
  totalInteractions: number
  averageSessionDuration: number
  lastActivity: Date
  mostVisitedPages: Array<{ path: string; count: number }>
  activityByHour: Record<string, number>
  activityByDay: Record<string, number>
  deviceStats: Record<string, number>
  browserStats: Record<string, number>
}

export class ActivityTracker {
  private static instance: ActivityTracker
  private userId: string | null = null
  private sessionId: string | null = null
  private startTime: Date | null = null
  private isTracking = false
  private activityQueue: ActivityEvent[] = []
  private heartbeatInterval: NodeJS.Timeout | null = null
  private sessionMetrics: Partial<SessionMetrics> = {}
  private pageStartTime: Date | null = null
  private lastActivity: Date = new Date()
  private inactivityTimeout: NodeJS.Timeout | null = null
  private visibilityChangeHandler: (() => void) | null = null

  private constructor() {
    this.initializeTracking()
  }

  static getInstance(): ActivityTracker {
    if (!ActivityTracker.instance) {
      ActivityTracker.instance = new ActivityTracker()
    }
    return ActivityTracker.instance
  }

  /**
   * Initialize activity tracking
   */
  private initializeTracking(): void {
    if (typeof window === 'undefined') return

    // Initialize session
    this.sessionId = this.generateSessionId()
    this.startTime = new Date()
    this.sessionMetrics = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      pageViews: 0,
      interactions: 0,
      bounceRate: 0,
      userAgent: navigator.userAgent,
      ipAddress: '', // Will be populated server-side
      deviceType: this.getDeviceType(),
      browserInfo: this.getBrowserInfo()
    }

    // Set up event listeners
    this.setupEventListeners()
    
    // Start heartbeat
    this.startHeartbeat()
    
    // Track session start
    this.trackEvent({
      type: 'session_start',
      category: 'auth',
      action: 'session_started',
      data: {
        deviceType: this.sessionMetrics.deviceType,
        browserInfo: this.sessionMetrics.browserInfo,
        timestamp: this.startTime
      }
    })

    log.info('Activity tracking initialized', {
      component: 'ActivityTracker',
      metadata: {
        sessionId: this.sessionId,
        deviceType: this.sessionMetrics.deviceType
      }
    })
  }

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string): void {
    this.userId = userId
    this.isTracking = true
    
    // Update session metrics
    this.sessionMetrics.userId = userId
    
    // Track login event
    this.trackEvent({
      type: 'login',
      category: 'auth',
      action: 'user_logged_in',
      data: {
        userId: userId,
        sessionId: this.sessionId
      }
    })
  }

  /**
   * Clear user ID (on logout)
   */
  clearUserId(): void {
    if (this.userId) {
      // Track logout event
      this.trackEvent({
        type: 'logout',
        category: 'auth',
        action: 'user_logged_out',
        data: {
          userId: this.userId,
          sessionId: this.sessionId,
          sessionDuration: this.getSessionDuration()
        }
      })
    }
    
    this.userId = null
    this.isTracking = false
  }

  /**
   * Track an activity event
   */
  trackEvent(event: ActivityEvent): void {
    if (!this.isTracking && event.type !== 'session_start') {
      return
    }

    const enhancedEvent: ActivityEvent = {
      ...event,
      timestamp: event.timestamp || new Date(),
      url: event.url || (typeof window !== 'undefined' ? window.location.href : undefined),
      referrer: event.referrer || (typeof window !== 'undefined' ? document.referrer : undefined)
    }

    // Update session metrics
    this.updateSessionMetrics(enhancedEvent)

    // Add to queue
    this.activityQueue.push(enhancedEvent)

    // Update last activity
    this.lastActivity = new Date()
    this.resetInactivityTimer()

    // Process queue if it's getting full
    if (this.activityQueue.length >= 10) {
      this.flushActivityQueue()
    }

    log.debug('Activity event tracked', {
      component: 'ActivityTracker',
      metadata: {
        type: event.type,
        action: event.action,
        userId: this.userId,
        sessionId: this.sessionId
      }
    })
  }

  /**
   * Track page view
   */
  trackPageView(path?: string, title?: string): void {
    const currentPath = path || (typeof window !== 'undefined' ? window.location.pathname : '')
    const pageTitle = title || (typeof window !== 'undefined' ? document.title : '')

    // Track page exit for previous page
    if (this.pageStartTime) {
      const pageViewDuration = Date.now() - this.pageStartTime.getTime()
      this.trackEvent({
        type: 'page_view',
        category: 'navigation',
        action: 'page_exit',
        label: currentPath,
        value: pageViewDuration,
        data: {
          duration: pageViewDuration,
          exitTime: new Date()
        }
      })
    }

    // Track new page view
    this.pageStartTime = new Date()
    this.trackEvent({
      type: 'page_view',
      category: 'navigation',
      action: 'page_view',
      label: currentPath,
      data: {
        title: pageTitle,
        path: currentPath,
        timestamp: this.pageStartTime
      }
    })
  }

  /**
   * Track user interaction
   */
  trackInteraction(element: string, action: string, data?: Record<string, any>): void {
    this.trackEvent({
      type: 'click',
      category: 'interaction',
      action: action,
      label: element,
      data: {
        element,
        ...data
      }
    })
  }

  /**
   * Track form submission
   */
  trackFormSubmission(formName: string, success: boolean, data?: Record<string, any>): void {
    this.trackEvent({
      type: 'form_submit',
      category: 'interaction',
      action: success ? 'form_submitted' : 'form_failed',
      label: formName,
      data: {
        formName,
        success,
        ...data
      }
    })
  }

  /**
   * Track search
   */
  trackSearch(query: string, results: number, data?: Record<string, any>): void {
    this.trackEvent({
      type: 'search',
      category: 'interaction',
      action: 'search_performed',
      label: query,
      value: results,
      data: {
        query,
        results,
        ...data
      }
    })
  }

  /**
   * Track booking action
   */
  trackBooking(action: string, bookingId?: string, data?: Record<string, any>): void {
    this.trackEvent({
      type: 'booking',
      category: 'transaction',
      action: action,
      label: bookingId,
      data: {
        bookingId,
        ...data
      }
    })
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, any>): void {
    this.trackEvent({
      type: 'error',
      category: 'system',
      action: 'error_occurred',
      label: error.message,
      data: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        context
      }
    })
  }

  /**
   * Track custom event
   */
  trackCustomEvent(action: string, category: string = 'custom', data?: Record<string, any>): void {
    this.trackEvent({
      type: 'custom',
      category: category as any,
      action: action,
      data: data
    })
  }

  /**
   * Get current session metrics
   */
  getSessionMetrics(): SessionMetrics {
    return {
      ...this.sessionMetrics,
      endTime: new Date(),
      duration: this.getSessionDuration()
    } as SessionMetrics
  }

  /**
   * Get user activity statistics
   */
  async getUserActivityStats(userId: string, days: number = 30): Promise<UserActivityStats> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const { data: activities, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return this.calculateActivityStats(activities || [], userId)

    } catch (error) {
      log.error('Error fetching user activity stats', error as Error, {
        component: 'ActivityTracker',
        userId
      })
      throw error
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return

    // Page unload
    window.addEventListener('beforeunload', () => {
      this.handleSessionEnd()
    })

    // Visibility change
    this.visibilityChangeHandler = () => {
      if (document.hidden) {
        this.handlePageHidden()
      } else {
        this.handlePageVisible()
      }
    }
    document.addEventListener('visibilitychange', this.visibilityChangeHandler)

    // Mouse and keyboard activity
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.lastActivity = new Date()
        this.resetInactivityTimer()
      }, { passive: true })
    })

    // Error tracking
    window.addEventListener('error', (event) => {
      this.trackError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        type: 'unhandled_rejection',
        reason: event.reason
      })
    })
  }

  /**
   * Update session metrics based on event
   */
  private updateSessionMetrics(event: ActivityEvent): void {
    if (!this.sessionMetrics) return

    switch (event.type) {
      case 'page_view':
        this.sessionMetrics.pageViews = (this.sessionMetrics.pageViews || 0) + 1
        break
      case 'click':
      case 'form_submit':
      case 'search':
        this.sessionMetrics.interactions = (this.sessionMetrics.interactions || 0) + 1
        break
    }

    // Update bounce rate
    if (this.sessionMetrics.pageViews && this.sessionMetrics.interactions) {
      this.sessionMetrics.bounceRate = this.sessionMetrics.interactions === 0 ? 1 : 0
    }
  }

  /**
   * Start heartbeat to periodically flush activity queue
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.flushActivityQueue()
    }, 30000) // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Flush activity queue to server
   */
  private async flushActivityQueue(): Promise<void> {
    if (this.activityQueue.length === 0) return

    const events = [...this.activityQueue]
    this.activityQueue = []

    try {
      // Send events to audit logger
      for (const event of events) {
        await auditLogger.logUserActivity({
          userId: this.userId || 'anonymous',
          sessionId: this.sessionId!,
          activityType: event.type,
          activityDescription: `${event.action} - ${event.label || ''}`,
          pageUrl: event.url,
          referrerUrl: event.referrer,
          activityData: {
            category: event.category,
            action: event.action,
            label: event.label,
            value: event.value,
            data: event.data,
            timestamp: event.timestamp
          }
        })
      }

    } catch (error) {
      log.error('Error flushing activity queue', error as Error, {
        component: 'ActivityTracker',
        metadata: {
          eventCount: events.length,
          userId: this.userId,
          sessionId: this.sessionId
        }
      })

      // Re-add events to queue if they failed
      this.activityQueue = [...events, ...this.activityQueue]
    }
  }

  /**
   * Handle session end
   */
  private handleSessionEnd(): void {
    if (this.sessionId) {
      this.trackEvent({
        type: 'session_end',
        category: 'auth',
        action: 'session_ended',
        data: {
          sessionDuration: this.getSessionDuration(),
          pageViews: this.sessionMetrics.pageViews,
          interactions: this.sessionMetrics.interactions,
          endTime: new Date()
        }
      })

      // Flush remaining events
      this.flushActivityQueue()
    }

    this.cleanup()
  }

  /**
   * Handle page hidden
   */
  private handlePageHidden(): void {
    this.trackEvent({
      type: 'custom',
      category: 'system',
      action: 'page_hidden',
      data: {
        timestamp: new Date()
      }
    })
  }

  /**
   * Handle page visible
   */
  private handlePageVisible(): void {
    this.trackEvent({
      type: 'custom',
      category: 'system',
      action: 'page_visible',
      data: {
        timestamp: new Date()
      }
    })
  }

  /**
   * Reset inactivity timer
   */
  private resetInactivityTimer(): void {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout)
    }

    this.inactivityTimeout = setTimeout(() => {
      this.trackEvent({
        type: 'custom',
        category: 'system',
        action: 'user_inactive',
        data: {
          inactiveDuration: 300000, // 5 minutes
          timestamp: new Date()
        }
      })
    }, 300000) // 5 minutes
  }

  /**
   * Calculate activity statistics
   */
  private calculateActivityStats(activities: any[], userId: string): UserActivityStats {
    const sessions = new Set(activities.map(a => a.session_id))
    const pageViews = activities.filter(a => a.activity_type === 'page_view')
    const interactions = activities.filter(a => ['click', 'form_submit', 'search'].includes(a.activity_type))

    // Calculate average session duration
    const sessionDurations = Array.from(sessions).map(sessionId => {
      const sessionActivities = activities.filter(a => a.session_id === sessionId)
      if (sessionActivities.length < 2) return 0
      
      const startTime = new Date(sessionActivities[sessionActivities.length - 1].created_at)
      const endTime = new Date(sessionActivities[0].created_at)
      return endTime.getTime() - startTime.getTime()
    })

    const averageSessionDuration = sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length || 0

    // Most visited pages
    const pageViewCounts: Record<string, number> = {}
    pageViews.forEach(pv => {
      const path = pv.activity_data?.data?.path || pv.page_url || 'unknown'
      pageViewCounts[path] = (pageViewCounts[path] || 0) + 1
    })

    const mostVisitedPages = Object.entries(pageViewCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }))

    // Activity by hour
    const activityByHour: Record<string, number> = {}
    for (let i = 0; i < 24; i++) {
      activityByHour[i.toString()] = 0
    }

    activities.forEach(activity => {
      const hour = new Date(activity.created_at).getHours()
      activityByHour[hour.toString()]++
    })

    // Activity by day
    const activityByDay: Record<string, number> = {}
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    daysOfWeek.forEach(day => {
      activityByDay[day] = 0
    })

    activities.forEach(activity => {
      const day = daysOfWeek[new Date(activity.created_at).getDay()]
      activityByDay[day]++
    })

    return {
      userId,
      totalSessions: sessions.size,
      totalPageViews: pageViews.length,
      totalInteractions: interactions.length,
      averageSessionDuration,
      lastActivity: activities.length > 0 ? new Date(activities[0].created_at) : new Date(),
      mostVisitedPages,
      activityByHour,
      activityByDay,
      deviceStats: {}, // Would need to parse user agents
      browserStats: {}  // Would need to parse user agents
    }
  }

  /**
   * Get session duration
   */
  private getSessionDuration(): number {
    if (!this.startTime) return 0
    return Date.now() - this.startTime.getTime()
  }

  /**
   * Get device type
   */
  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop'
    
    const userAgent = navigator.userAgent
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet'
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile'
    }
    return 'desktop'
  }

  /**
   * Get browser info
   */
  private getBrowserInfo(): { name: string; version: string; os: string } {
    if (typeof window === 'undefined') {
      return { name: 'unknown', version: 'unknown', os: 'unknown' }
    }

    const userAgent = navigator.userAgent
    let browserName = 'unknown'
    let browserVersion = 'unknown'
    let os = 'unknown'

    // Browser detection
    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome'
      browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown'
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox'
      browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'unknown'
    } else if (userAgent.includes('Safari')) {
      browserName = 'Safari'
      browserVersion = userAgent.match(/Safari\/(\d+)/)?.[1] || 'unknown'
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge'
      browserVersion = userAgent.match(/Edge\/(\d+)/)?.[1] || 'unknown'
    }

    // OS detection
    if (userAgent.includes('Windows')) {
      os = 'Windows'
    } else if (userAgent.includes('Mac')) {
      os = 'macOS'
    } else if (userAgent.includes('Linux')) {
      os = 'Linux'
    } else if (userAgent.includes('Android')) {
      os = 'Android'
    } else if (userAgent.includes('iOS')) {
      os = 'iOS'
    }

    return { name: browserName, version: browserVersion, os }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopHeartbeat()
    
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout)
    }

    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler)
    }
  }
}

// Export singleton instance
export const activityTracker = ActivityTracker.getInstance()
export default activityTracker