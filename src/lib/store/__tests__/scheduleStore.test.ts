import { renderHook, act } from '@testing-library/react'
import { useScheduleStore } from '../scheduleStore'

// Mock fetch
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('useScheduleStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    
    // Reset store state
    useScheduleStore.setState({
      selectedDate: null,
      availableSlots: [],
      selectedSlot: null,
      isLoading: false,
      error: null,
      lastFetch: null,
      refreshKey: 0
    })
  })

  describe('Basic State Management', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useScheduleStore())
      
      expect(result.current.selectedDate).toBeNull()
      expect(result.current.availableSlots).toEqual([])
      expect(result.current.selectedSlot).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('sets selected date', () => {
      const { result } = renderHook(() => useScheduleStore())
      
      act(() => {
        result.current.setSelectedDate('2024-01-15')
      })
      
      expect(result.current.selectedDate).toBe('2024-01-15')
    })

    it('sets selected slot', () => {
      const { result } = renderHook(() => useScheduleStore())
      
      const mockSlot = {
        id: '1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '11:00',
        duration: 120,
        availableCapacity: 1,
        totalCapacity: 1,
        status: 'available' as const,
        category: 'standard' as const,
        isStandard: true,
        displayOrder: 1
      }
      
      act(() => {
        result.current.setSelectedSlot(mockSlot)
      })
      
      expect(result.current.selectedSlot).toEqual(mockSlot)
    })

    it('clears selected slot', () => {
      const { result } = renderHook(() => useScheduleStore())
      
      const mockSlot = {
        id: '1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '11:00',
        duration: 120,
        availableCapacity: 1,
        totalCapacity: 1,
        status: 'available' as const,
        category: 'standard' as const,
        isStandard: true,
        displayOrder: 1
      }
      
      act(() => {
        result.current.setSelectedSlot(mockSlot)
      })
      
      expect(result.current.selectedSlot).toEqual(mockSlot)
      
      act(() => {
        result.current.clearSelectedSlot()
      })
      
      expect(result.current.selectedSlot).toBeNull()
    })
  })

  describe('Fetch Available Slots', () => {
    it('fetches available slots successfully', async () => {
      const mockSlots = [
        {
          id: '1',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '11:00',
          duration: 120,
          availableCapacity: 1,
          totalCapacity: 1,
          status: 'available',
          category: 'standard',
          isStandard: true,
          displayOrder: 1
        }
      ]
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSlots })
      } as Response)
      
      const { result } = renderHook(() => useScheduleStore())
      
      await act(async () => {
        await result.current.fetchAvailableSlots({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium'
        })
      })
      
      expect(result.current.availableSlots).toEqual(mockSlots)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('handles fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch slots' })
      } as Response)
      
      const { result } = renderHook(() => useScheduleStore())
      
      await act(async () => {
        await result.current.fetchAvailableSlots({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium'
        })
      })
      
      expect(result.current.availableSlots).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Failed to fetch slots')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      const { result } = renderHook(() => useScheduleStore())
      
      await act(async () => {
        await result.current.fetchAvailableSlots({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium'
        })
      })
      
      expect(result.current.availableSlots).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Failed to load available slots')
    })

    it('sets loading state during fetch', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      
      mockFetch.mockReturnValueOnce(promise)
      
      const { result } = renderHook(() => useScheduleStore())
      
      const fetchPromise = act(async () => {
        await result.current.fetchAvailableSlots({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium'
        })
      })
      
      // Check loading state
      expect(result.current.isLoading).toBe(true)
      
      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })
      
      await fetchPromise
      
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Caching and Refresh', () => {
    it('uses cache when available and fresh', async () => {
      const { result } = renderHook(() => useScheduleStore())
      
      // Set cache
      act(() => {
        result.current.setCache('test-key', [], new Date())
      })
      
      const cachedData = result.current.getCache('test-key')
      
      expect(cachedData).toEqual([])
    })

    it('invalidates expired cache', async () => {
      const { result } = renderHook(() => useScheduleStore())
      
      // Set cache with old timestamp
      const oldTimestamp = new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
      act(() => {
        result.current.setCache('test-key', [], oldTimestamp)
      })
      
      const cachedData = result.current.getCache('test-key')
      
      expect(cachedData).toBeNull()
    })

    it('refreshes data when refresh is called', async () => {
      const mockSlots = [
        {
          id: '1',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '11:00',
          duration: 120,
          availableCapacity: 1,
          totalCapacity: 1,
          status: 'available',
          category: 'standard',
          isStandard: true,
          displayOrder: 1
        }
      ]
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSlots })
      } as Response)
      
      const { result } = renderHook(() => useScheduleStore())
      
      await act(async () => {
        await result.current.refreshAvailableSlots()
      })
      
      expect(result.current.refreshKey).toBeGreaterThan(0)
    })
  })

  describe('Optimistic Updates', () => {
    it('performs optimistic update for slot selection', async () => {
      const { result } = renderHook(() => useScheduleStore())
      
      const mockSlot = {
        id: '1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '11:00',
        duration: 120,
        availableCapacity: 1,
        totalCapacity: 1,
        status: 'available' as const,
        category: 'standard' as const,
        isStandard: true,
        displayOrder: 1
      }
      
      // Set initial slots
      act(() => {
        result.current.setAvailableSlots([mockSlot])
      })
      
      // Mock successful booking
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)
      
      await act(async () => {
        await result.current.bookSlotOptimistic(mockSlot.id, {
          customerDetails: { name: 'Test', email: 'test@example.com' },
          vehicleDetails: { size: 'medium' }
        })
      })
      
      expect(result.current.selectedSlot).toEqual(mockSlot)
    })

    it('reverts optimistic update on failure', async () => {
      const { result } = renderHook(() => useScheduleStore())
      
      const mockSlot = {
        id: '1',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '11:00',
        duration: 120,
        availableCapacity: 1,
        totalCapacity: 1,
        status: 'available' as const,
        category: 'standard' as const,
        isStandard: true,
        displayOrder: 1
      }
      
      // Set initial slots
      act(() => {
        result.current.setAvailableSlots([mockSlot])
      })
      
      // Mock failed booking
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Booking failed' })
      } as Response)
      
      await act(async () => {
        await result.current.bookSlotOptimistic(mockSlot.id, {
          customerDetails: { name: 'Test', email: 'test@example.com' },
          vehicleDetails: { size: 'medium' }
        })
      })
      
      expect(result.current.selectedSlot).toBeNull()
      expect(result.current.error).toBe('Booking failed')
    })
  })

  describe('Error Handling', () => {
    it('clears error when new successful request is made', async () => {
      const { result } = renderHook(() => useScheduleStore())
      
      // Set initial error
      act(() => {
        result.current.setError('Previous error')
      })
      
      expect(result.current.error).toBe('Previous error')
      
      // Make successful request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      } as Response)
      
      await act(async () => {
        await result.current.fetchAvailableSlots({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium'
        })
      })
      
      expect(result.current.error).toBeNull()
    })

    it('handles API error responses', async () => {
      const { result } = renderHook(() => useScheduleStore())
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      } as Response)
      
      await act(async () => {
        await result.current.fetchAvailableSlots({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium'
        })
      })
      
      expect(result.current.error).toBe('Internal server error')
    })
  })

  describe('Date Filtering', () => {
    it('filters slots by date range', () => {
      const { result } = renderHook(() => useScheduleStore())
      
      const mockSlots = [
        {
          id: '1',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '11:00',
          duration: 120,
          availableCapacity: 1,
          totalCapacity: 1,
          status: 'available' as const,
          category: 'standard' as const,
          isStandard: true,
          displayOrder: 1
        },
        {
          id: '2',
          date: '2024-01-16',
          startTime: '09:00',
          endTime: '11:00',
          duration: 120,
          availableCapacity: 1,
          totalCapacity: 1,
          status: 'available' as const,
          category: 'standard' as const,
          isStandard: true,
          displayOrder: 1
        }
      ]
      
      act(() => {
        result.current.setAvailableSlots(mockSlots)
      })
      
      const filteredSlots = result.current.getSlotsByDate('2024-01-15')
      
      expect(filteredSlots).toHaveLength(1)
      expect(filteredSlots[0].date).toBe('2024-01-15')
    })
  })
})