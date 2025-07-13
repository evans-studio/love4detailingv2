/**
 * Schedule Background Synchronization and State Persistence
 * Enterprise-grade background sync with state persistence
 * Implements real-time updates and multi-user synchronization
 */

import { useScheduleStore } from './schedule-enhanced'

export interface SyncConfig {
  backgroundSyncInterval: number // milliseconds
  enableBackgroundSync: boolean
  enableStatePersistence: boolean
  enableRealTimeUpdates: boolean
  persistenceKey: string
  maxRetries: number
  retryDelay: number
}

export const defaultSyncConfig: SyncConfig = {
  backgroundSyncInterval: 30000, // 30 seconds
  enableBackgroundSync: true,
  enableStatePersistence: true,
  enableRealTimeUpdates: true,
  persistenceKey: 'love4detailing_schedule_state',
  maxRetries: 3,
  retryDelay: 1000
}

export class ScheduleSyncManager {
  private config: SyncConfig
  private syncInterval: NodeJS.Timeout | null = null
  private isActive = false
  private lastSyncTimestamp = 0
  private retryCount = 0

  constructor(config: Partial<SyncConfig> = {}) {
    this.config = { ...defaultSyncConfig, ...config }
  }

  /**
   * Initialize background synchronization
   */
  start(): void {
    if (this.isActive) {
      console.warn('ScheduleSyncManager is already active')
      return
    }

    this.isActive = true
    this.loadPersistedState()
    
    if (this.config.enableBackgroundSync) {
      this.startBackgroundSync()
    }
    
    if (this.config.enableStatePersistence) {
      this.setupStatePersistence()
    }
    
    if (this.config.enableRealTimeUpdates) {
      this.setupRealTimeUpdates()
    }

    console.log('ScheduleSyncManager started with config:', this.config)
  }

  /**
   * Stop background synchronization
   */
  stop(): void {
    if (!this.isActive) {
      return
    }

    this.isActive = false
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    console.log('ScheduleSyncManager stopped')
  }

  /**
   * Start background synchronization
   */
  private startBackgroundSync(): void {
    this.syncInterval = setInterval(() => {
      this.performBackgroundSync()
    }, this.config.backgroundSyncInterval)
  }

  /**
   * Perform background synchronization
   */
  private async performBackgroundSync(): Promise<void> {
    if (!this.isActive) {
      return
    }

    try {
      const store = useScheduleStore.getState()
      
      // Only sync if there's been recent activity
      const timeSinceLastActivity = Date.now() - store.lastSync
      if (timeSinceLastActivity > this.config.backgroundSyncInterval * 2) {
        return // Skip sync if no recent activity
      }

      console.log('Performing background sync...')
      
      // Check if any mutations are in progress
      const hasPendingMutations = Object.values(store.mutations).some((m: any) => m.isLoading)
      if (hasPendingMutations) {
        console.log('Skipping background sync - mutations in progress')
        return
      }

      // Perform background refresh
      await store.refreshData()
      
      this.lastSyncTimestamp = Date.now()
      this.retryCount = 0 // Reset retry count on success
      
      console.log('Background sync completed successfully')
      
    } catch (error) {
      console.error('Background sync failed:', error)
      
      this.retryCount++
      if (this.retryCount < this.config.maxRetries) {
        console.log(`Retrying background sync in ${this.config.retryDelay}ms (attempt ${this.retryCount}/${this.config.maxRetries})`)
        
        setTimeout(() => {
          this.performBackgroundSync()
        }, this.config.retryDelay)
      } else {
        console.error('Background sync failed after maximum retries')
        this.retryCount = 0
      }
    }
  }

  /**
   * Setup state persistence
   */
  private setupStatePersistence(): void {
    const store = useScheduleStore.getState()
    
    // Subscribe to state changes and persist important data
    useScheduleStore.subscribe((state: any) => {
      if (!this.isActive) return
      
      const persistedState = {
        selectedDate: state.selectedDate,
        currentWeekStart: state.currentWeekStart,
        lastSync: state.lastSync,
        timestamp: Date.now()
      }
      
      try {
        localStorage.setItem(this.config.persistenceKey, JSON.stringify(persistedState))
      } catch (error) {
        console.warn('Failed to persist state:', error)
      }
    })
  }

  /**
   * Load persisted state
   */
  private loadPersistedState(): void {
    try {
      const persistedData = localStorage.getItem(this.config.persistenceKey)
      if (!persistedData) return
      
      const state = JSON.parse(persistedData)
      const store = useScheduleStore.getState()
      
      // Only restore if the persisted state is recent (within 1 hour)
      const isRecent = state.timestamp && (Date.now() - state.timestamp) < 3600000
      
      if (isRecent) {
        if (state.selectedDate) {
          store.setSelectedDate(state.selectedDate)
        }
        
        // Restore current week start if available
        if (state.currentWeekStart) {
          store.loadWeekOverview(state.currentWeekStart)
        }
        
        console.log('Restored persisted state:', state)
      } else {
        // Clear old persisted state
        localStorage.removeItem(this.config.persistenceKey)
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error)
      localStorage.removeItem(this.config.persistenceKey)
    }
  }

  /**
   * Setup real-time updates (simulated with periodic checks)
   * In a real implementation, this would use WebSockets or Server-Sent Events
   */
  private setupRealTimeUpdates(): void {
    // For now, implement as enhanced background sync
    // In production, this would connect to a real-time service
    
    const enhancedSyncInterval = setInterval(async () => {
      if (!this.isActive) {
        clearInterval(enhancedSyncInterval)
        return
      }
      
      const store = useScheduleStore.getState()
      
      // Check for updates from other users
      try {
        const response = await fetch('/api/admin/schedule/check-updates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lastSync: store.lastSync,
            weekStart: store.currentWeekStart
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          
          if (data.hasUpdates) {
            console.log('Real-time updates detected, refreshing data...')
            await store.refreshData()
          }
        }
      } catch (error) {
        // Silently fail for real-time checks
        console.debug('Real-time update check failed:', error)
      }
    }, 10000) // Check every 10 seconds for real-time updates
  }

  /**
   * Force immediate synchronization
   */
  async forcSync(): Promise<void> {
    if (!this.isActive) {
      throw new Error('ScheduleSyncManager is not active')
    }
    
    await this.performBackgroundSync()
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isActive: boolean
    lastSyncTimestamp: number
    retryCount: number
    config: SyncConfig
  } {
    return {
      isActive: this.isActive,
      lastSyncTimestamp: this.lastSyncTimestamp,
      retryCount: this.retryCount,
      config: this.config
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (this.isActive) {
      // Restart with new configuration
      this.stop()
      this.start()
    }
  }
}

// Global sync manager instance
let globalSyncManager: ScheduleSyncManager | null = null

/**
 * Get or create the global sync manager
 */
export function getScheduleSyncManager(config?: Partial<SyncConfig>): ScheduleSyncManager {
  if (!globalSyncManager) {
    globalSyncManager = new ScheduleSyncManager(config)
  }
  
  return globalSyncManager
}

/**
 * React hook for using the sync manager
 */
export function useScheduleSync(config?: Partial<SyncConfig>) {
  const syncManager = getScheduleSyncManager(config)
  
  // Auto-start when component mounts
  React.useEffect(() => {
    syncManager.start()
    
    return () => {
      syncManager.stop()
    }
  }, [syncManager])
  
  return {
    forcSync: () => syncManager.forcSync(),
    getSyncStatus: () => syncManager.getSyncStatus(),
    updateConfig: (newConfig: Partial<SyncConfig>) => syncManager.updateConfig(newConfig)
  }
}

// Add React import for the hook
import React from 'react'