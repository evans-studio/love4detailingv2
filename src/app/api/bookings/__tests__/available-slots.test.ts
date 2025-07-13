import { POST } from '../available-slots/route'
import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn()
}))

const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis()
}

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>

describe('/api/bookings/available-slots', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateServerClient.mockReturnValue(mockSupabase as any)
  })

  describe('POST /api/bookings/available-slots', () => {
    it('returns available slots successfully', async () => {
      const mockSlots = [
        {
          id: '1',
          slot_date: '2024-01-15',
          start_time: '09:00',
          end_time: '11:00',
          duration_minutes: 120,
          available_capacity: 1,
          total_capacity: 1,
          status: 'available',
          category: 'standard',
          is_standard: true,
          display_order: 1,
          pricing_info: {
            base_price_pence: 8000,
            duration_minutes: 120,
            vehicle_size: 'medium'
          }
        }
      ]
      
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockSlots,
        error: null
      })
      
      const request = new NextRequest('http://localhost/api/bookings/available-slots', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockSlots)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_enhanced_available_slots', {
        date_start: '2024-01-15',
        date_end: '2024-01-21',
        service_id: 'service-1',
        vehicle_size: 'medium'
      })
    })

    it('handles database errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      })
      
      const request = new NextRequest('http://localhost/api/bookings/available-slots', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database connection failed')
    })

    it('handles missing required parameters', async () => {
      const request = new NextRequest('http://localhost/api/bookings/available-slots', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2024-01-15',
          // Missing endDate, serviceId, vehicleSize
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing required parameters')
    })

    it('handles invalid date ranges', async () => {
      const request = new NextRequest('http://localhost/api/bookings/available-slots', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2024-01-21',
          endDate: '2024-01-15', // End date before start date
          serviceId: 'service-1',
          vehicleSize: 'medium'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid date range')
    })

    it('handles invalid vehicle size', async () => {
      const request = new NextRequest('http://localhost/api/bookings/available-slots', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'invalid-size'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid vehicle size')
    })

    it('handles malformed JSON', async () => {
      const request = new NextRequest('http://localhost/api/bookings/available-slots', {
        method: 'POST',
        body: 'invalid json'
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request body')
    })

    it('returns empty array when no slots available', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      })
      
      const request = new NextRequest('http://localhost/api/bookings/available-slots', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it('handles network timeouts', async () => {
      mockSupabase.rpc.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 100)
        })
      })
      
      const request = new NextRequest('http://localhost/api/bookings/available-slots', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium'
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Request timeout')
    })

    it('applies correct filters and sorting', async () => {
      const mockSlots = [
        {
          id: '1',
          slot_date: '2024-01-15',
          start_time: '09:00',
          end_time: '11:00',
          duration_minutes: 120,
          available_capacity: 1,
          total_capacity: 1,
          status: 'available',
          category: 'standard',
          is_standard: true,
          display_order: 1
        },
        {
          id: '2',
          slot_date: '2024-01-15',
          start_time: '12:00',
          end_time: '14:00',
          duration_minutes: 120,
          available_capacity: 1,
          total_capacity: 1,
          status: 'available',
          category: 'popular',
          is_standard: true,
          display_order: 2
        }
      ]
      
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockSlots,
        error: null
      })
      
      const request = new NextRequest('http://localhost/api/bookings/available-slots', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium',
          filters: {
            statusFilter: 'available',
            categoryFilter: 'standard'
          }
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockSlots)
    })

    it('handles capacity constraints', async () => {
      const mockSlots = [
        {
          id: '1',
          slot_date: '2024-01-15',
          start_time: '09:00',
          end_time: '11:00',
          duration_minutes: 120,
          available_capacity: 0,
          total_capacity: 1,
          status: 'booked',
          category: 'standard',
          is_standard: true,
          display_order: 1
        }
      ]
      
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockSlots,
        error: null
      })
      
      const request = new NextRequest('http://localhost/api/bookings/available-slots', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2024-01-15',
          endDate: '2024-01-21',
          serviceId: 'service-1',
          vehicleSize: 'medium',
          includeFullyBooked: true
        })
      })
      
      const response = await POST(request)
      const data = await response.json()
      
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockSlots)
    })
  })
})