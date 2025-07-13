'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/context'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Vehicle {
  id: string
  user_id: string
  registration: string
  make: string
  model: string
  year: number
  color?: string
  size: 'S' | 'M' | 'L' | 'XL'
  size_confirmed?: boolean
  booking_count?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useVehicles() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState<{ type: string; message: string; timestamp: number } | null>(null)
  const [realtimeRetryCount, setRealtimeRetryCount] = useState(0)
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null)
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now())
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0)
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    fetchTime: number;
    cacheHits: number;
    cacheMisses: number;
    totalRequests: number;
  }>({
    fetchTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0
  })
  const supabase = createClientComponentClient()

  const logError = (type: string, message: string, originalError?: any) => {
    const errorInfo = {
      type,
      message,
      timestamp: Date.now(),
      originalError: originalError?.message || originalError
    }
    setLastError(errorInfo)
    console.error(`[useVehicles] ${type}:`, message, originalError)
  }

  const fetchVehicles = async (isRetry = false, forceRefresh = false) => {
    if (!user) {
      setVehicles([])
      setIsLoading(false)
      return
    }

    // Enterprise Feature: Smart Caching
    const now = Date.now()
    const cacheKey = `vehicles_${user.id}`
    const cacheValidityMs = 5 * 60 * 1000 // 5 minutes
    
    // Check cache first (unless force refresh)
    if (!forceRefresh && !isRetry && cacheTimestamp > 0 && (now - cacheTimestamp) < cacheValidityMs) {
      const cachedData = localStorage.getItem(cacheKey)
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData)
          setVehicles(parsedData)
          setIsLoading(false)
          
          // Update performance metrics
          setPerformanceMetrics(prev => ({
            ...prev,
            cacheHits: prev.cacheHits + 1,
            totalRequests: prev.totalRequests + 1
          }))
          
          console.log('🚀 Cache hit: Using cached vehicle data')
          return
        } catch (e) {
          console.warn('Cache parse error, fetching fresh data')
          localStorage.removeItem(cacheKey)
        }
      }
    }

    try {
      setIsLoading(true)
      if (!isRetry) {
        setError(null)
        setRetryCount(0)
      }

      // Performance monitoring
      const startTime = performance.now()
      const response = await fetch('/api/vehicles')
      
      if (!response.ok) {
        if (response.status === 401) {
          logError('AUTHENTICATION_ERROR', 'Session expired. Please log in again.')
          setError('Session expired. Please log in again.')
          return
        }
        
        if (response.status === 403) {
          logError('AUTHORIZATION_ERROR', 'Access denied. Insufficient permissions.')
          setError('Access denied. Please check your permissions.')
          return
        }
        
        if (response.status >= 500) {
          logError('SERVER_ERROR', 'Server error. Please try again later.')
          setError('Server error. Please try again later.')
          return
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const { data } = await response.json()
      const vehicleData = data || []
      setVehicles(vehicleData)
      setError(null)
      setRetryCount(0)
      
      // Cache the data
      try {
        localStorage.setItem(cacheKey, JSON.stringify(vehicleData))
        setCacheTimestamp(now)
      } catch (e) {
        console.warn('Failed to cache vehicle data:', e)
      }
      
      // Performance monitoring
      const endTime = performance.now()
      const fetchTime = endTime - startTime
      
      setPerformanceMetrics(prev => ({
        ...prev,
        fetchTime,
        cacheMisses: prev.cacheMisses + 1,
        totalRequests: prev.totalRequests + 1
      }))
      
      console.log(`📊 API fetch completed in ${fetchTime.toFixed(2)}ms`)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch vehicles'
      logError('FETCH_ERROR', errorMessage, error)
      
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1)
        setTimeout(() => fetchVehicles(true), 1000 * (retryCount + 1))
        setError(`Connection failed. Retrying... (${retryCount + 1}/3)`)
      } else {
        setError('Connection failed. Please check your internet connection and try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // TEMPORARILY DISABLED: Real-time connection setup
  const setupRealTimeConnection = useCallback(() => {
    console.log('Real-time subscription temporarily disabled for system stability')
    setIsRealTimeConnected(false)
    return null
  }, []) // Simplified to prevent any connection attempts

  // TEMPORARILY DISABLED: Reconnection attempts
  const attemptReconnection = useCallback(() => {
    console.log('Real-time reconnection temporarily disabled for system stability')
    setRealtimeRetryCount(0)
  }, []) // Simplified to prevent any reconnection attempts

  // TEMPORARILY DISABLED: Heartbeat monitoring
  // useEffect(() => {
  //   // Real-time monitoring disabled for system stability
  // }, [])

  useEffect(() => {
    fetchVehicles()
    
    // TEMPORARY: Real-time subscription disabled to prevent connection overload
    // TODO: Re-enable after fixing infinite loop issues
    // if (user) {
    //   setupRealTimeConnection()
    // }

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up real-time subscription')
      if (realtimeChannel) {
        try {
          supabase.removeChannel(realtimeChannel)
        } catch (error) {
          logError('REALTIME_CLEANUP_ERROR', 'Error cleaning up real-time subscription', error)
        }
      }
    }
  }, [user]) // EMERGENCY: Real-time temporarily disabled

  // Real-time event handlers
  const handleRealTimeInsert = (newVehicle: Vehicle) => {
    console.log('Real-time INSERT:', newVehicle)
    setLastHeartbeat(Date.now()) // Update heartbeat
    
    // Transform the vehicle data to match frontend format
    const transformedVehicle: Vehicle = {
      ...newVehicle,
      size: dbToFrontendSizeMap[newVehicle.size as keyof typeof dbToFrontendSizeMap] || 'M',
      size_confirmed: newVehicle.size_confirmed || false,
      booking_count: newVehicle.booking_count || 0,
    } as Vehicle
    
    setVehicles(prev => {
      // Check if vehicle already exists to avoid duplicates
      const exists = prev.some(v => v.id === transformedVehicle.id)
      if (exists) return prev
      
      return [transformedVehicle, ...prev]
    })
  }

  const handleRealTimeUpdate = (updatedVehicle: Vehicle) => {
    console.log('Real-time UPDATE:', updatedVehicle)
    setLastHeartbeat(Date.now()) // Update heartbeat
    
    // Transform the vehicle data to match frontend format
    const transformedVehicle: Vehicle = {
      ...updatedVehicle,
      size: dbToFrontendSizeMap[updatedVehicle.size as keyof typeof dbToFrontendSizeMap] || 'M',
      size_confirmed: updatedVehicle.size_confirmed || false,
      booking_count: updatedVehicle.booking_count || 0,
    } as Vehicle
    
    setVehicles(prev => prev.map(v => 
      v.id === transformedVehicle.id ? transformedVehicle : v
    ))
  }

  const handleRealTimeDelete = (deletedVehicle: Vehicle) => {
    console.log('Real-time DELETE:', deletedVehicle)
    setLastHeartbeat(Date.now()) // Update heartbeat
    
    setVehicles(prev => prev.filter(v => v.id !== deletedVehicle.id))
  }

  // Size mapping for real-time transformations
  const dbToFrontendSizeMap = {
    'small': 'S',
    'medium': 'M',
    'large': 'L',
    'extra_large': 'XL'
  }

  const createVehicle = async (vehicleData: any) => {
    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicleData }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        const errorMessage = error || 'Failed to create vehicle'
        
        if (response.status === 409) {
          logError('DUPLICATE_VEHICLE_ERROR', 'Vehicle with this registration already exists')
          return { data: null, error: 'Vehicle with this registration already exists' }
        }
        
        if (response.status === 422) {
          logError('VALIDATION_ERROR', 'Invalid vehicle data provided')
          return { data: null, error: 'Invalid vehicle data. Please check your input.' }
        }
        
        logError('CREATE_VEHICLE_ERROR', errorMessage)
        throw new Error(errorMessage)
      }

      const { data } = await response.json()
      
      // Enterprise Feature: Cache invalidation
      const cacheKey = `vehicles_${user?.id}`
      localStorage.removeItem(cacheKey)
      setCacheTimestamp(0)
      
      await fetchVehicles(false, true) // Force refresh
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create vehicle'
      logError('CREATE_VEHICLE_ERROR', errorMessage, error)
      return { 
        data: null, 
        error: errorMessage
      }
    }
  }

  const updateVehicle = async (vehicleId: string, vehicleData: any) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vehicleData }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        const errorMessage = error || 'Failed to update vehicle'
        
        if (response.status === 404) {
          logError('VEHICLE_NOT_FOUND_ERROR', 'Vehicle not found')
          return { data: null, error: 'Vehicle not found. It may have been deleted.' }
        }
        
        if (response.status === 409) {
          logError('DUPLICATE_VEHICLE_ERROR', 'Vehicle with this registration already exists')
          return { data: null, error: 'Vehicle with this registration already exists' }
        }
        
        logError('UPDATE_VEHICLE_ERROR', errorMessage)
        throw new Error(errorMessage)
      }

      const { data } = await response.json()
      
      // Enterprise Feature: Cache invalidation
      const cacheKey = `vehicles_${user?.id}`
      localStorage.removeItem(cacheKey)
      setCacheTimestamp(0)
      
      await fetchVehicles(false, true) // Force refresh
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update vehicle'
      logError('UPDATE_VEHICLE_ERROR', errorMessage, error)
      return { 
        data: null, 
        error: errorMessage
      }
    }
  }

  const deleteVehicle = async (vehicleId: string) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const { error } = await response.json()
        const errorMessage = error || 'Failed to delete vehicle'
        
        if (response.status === 404) {
          logError('VEHICLE_NOT_FOUND_ERROR', 'Vehicle not found')
          return { error: 'Vehicle not found. It may have already been deleted.' }
        }
        
        if (response.status === 409) {
          logError('VEHICLE_CONSTRAINT_ERROR', 'Vehicle cannot be deleted due to existing bookings')
          return { error: 'Vehicle cannot be deleted because it has existing bookings.' }
        }
        
        logError('DELETE_VEHICLE_ERROR', errorMessage)
        throw new Error(errorMessage)
      }

      // Enterprise Feature: Cache invalidation
      const cacheKey = `vehicles_${user?.id}`
      localStorage.removeItem(cacheKey)
      setCacheTimestamp(0)
      
      await fetchVehicles(false, true) // Force refresh
      return { error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete vehicle'
      logError('DELETE_VEHICLE_ERROR', errorMessage, error)
      return { 
        error: errorMessage
      }
    }
  }

  const detectVehicleSize = async (make: string, model: string, year?: number) => {
    try {
      const response = await fetch('/api/vehicles/detect-size', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ make, model, year }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        const errorMessage = error || 'Failed to detect vehicle size'
        
        if (response.status === 404) {
          logError('VEHICLE_SIZE_NOT_FOUND_ERROR', 'Vehicle size not found in database')
          return { data: null, error: 'Vehicle size not found. Using default size.' }
        }
        
        logError('DETECT_SIZE_ERROR', errorMessage)
        throw new Error(errorMessage)
      }

      const { data } = await response.json()
      return { data, error: null }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to detect vehicle size'
      logError('DETECT_SIZE_ERROR', errorMessage, error)
      return { 
        data: null, 
        error: errorMessage
      }
    }
  }

  return {
    vehicles,
    isLoading,
    error,
    isRealTimeConnected,
    retryCount,
    lastError,
    realtimeRetryCount,
    performanceMetrics,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    detectVehicleSize,
    refetch: fetchVehicles,
    reconnectRealtime: setupRealTimeConnection,
  }
}