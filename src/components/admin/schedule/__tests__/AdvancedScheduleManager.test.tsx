import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdvancedScheduleManager from '../AdvancedScheduleManager'
import { useScheduleStore } from '@/lib/store'
import '@testing-library/jest-dom'

// Mock the store
jest.mock('@/lib/store', () => ({
  useScheduleStore: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

const mockUseScheduleStore = useScheduleStore as jest.MockedFunction<typeof useScheduleStore>
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

const mockStoreData = {
  weekOverview: [
    {
      day_date: '2024-01-15',
      day_name: 'Monday',
      is_working_day: true,
      total_slots: 5,
      available_slots: 3,
      booked_slots: 2
    },
    {
      day_date: '2024-01-16',
      day_name: 'Tuesday',
      is_working_day: true,
      total_slots: 5,
      available_slots: 5,
      booked_slots: 0
    }
  ],
  selectedDate: '2024-01-15',
  daySlots: [
    {
      slot_id: '1',
      start_time: '09:00',
      end_time: '11:00',
      duration_minutes: 120,
      max_bookings: 1,
      current_bookings: 0,
      is_available: true
    },
    {
      slot_id: '2',
      start_time: '12:00',
      end_time: '14:00',
      duration_minutes: 120,
      max_bookings: 1,
      current_bookings: 1,
      is_available: false
    }
  ],
  isLoading: false,
  error: null,
  setSelectedDate: jest.fn(),
  loadWeekOverview: jest.fn(),
  loadDaySlots: jest.fn(),
  toggleWorkingDay: jest.fn(),
  addSlot: jest.fn(),
  deleteSlot: jest.fn()
}

describe('AdvancedScheduleManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseScheduleStore.mockReturnValue(mockStoreData)
    mockFetch.mockClear()
  })

  it('renders all main tabs', () => {
    render(<AdvancedScheduleManager />)
    
    expect(screen.getByText('Schedule')).toBeInTheDocument()
    expect(screen.getByText('Templates')).toBeInTheDocument()
    expect(screen.getByText('Bulk Operations')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
  })

  it('displays week overview correctly', () => {
    render(<AdvancedScheduleManager />)
    
    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Tuesday')).toBeInTheDocument()
    expect(screen.getByText('3/5 available')).toBeInTheDocument()
    expect(screen.getByText('5/5 available')).toBeInTheDocument()
  })

  it('displays day slots when date is selected', () => {
    render(<AdvancedScheduleManager />)
    
    expect(screen.getByText('Time Slots - Mon, Jan 15')).toBeInTheDocument()
    expect(screen.getByText('9:00 AM - 11:00 AM')).toBeInTheDocument()
    expect(screen.getByText('12:00 PM - 2:00 PM')).toBeInTheDocument()
  })

  it('handles working day toggle', async () => {
    render(<AdvancedScheduleManager />)
    
    const toggleSwitches = screen.getAllByRole('switch')
    const mondayToggle = toggleSwitches[0]
    
    fireEvent.click(mondayToggle)
    
    expect(mockStoreData.toggleWorkingDay).toHaveBeenCalledWith('2024-01-15', false)
  })

  it('handles slot search', async () => {
    render(<AdvancedScheduleManager />)
    
    const searchInput = screen.getByPlaceholderText('Search slots...')
    fireEvent.change(searchInput, { target: { value: '09:00' } })
    
    // Should filter slots containing '09:00'
    expect(screen.getByText('9:00 AM - 11:00 AM')).toBeInTheDocument()
  })

  it('handles status filter', async () => {
    render(<AdvancedScheduleManager />)
    
    const statusFilter = screen.getByDisplayValue('All Status')
    fireEvent.change(statusFilter, { target: { value: 'available' } })
    
    // Should show only available slots
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  describe('Templates Tab', () => {
    it('displays templates tab content', () => {
      render(<AdvancedScheduleManager />)
      
      const templatesTab = screen.getByText('Templates')
      fireEvent.click(templatesTab)
      
      expect(screen.getByText('Schedule Templates')).toBeInTheDocument()
      expect(screen.getByText('Create New Template')).toBeInTheDocument()
    })

    it('handles template creation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, template: { id: '1', name: 'Test Template' } })
      } as Response)
      
      render(<AdvancedScheduleManager />)
      
      const templatesTab = screen.getByText('Templates')
      fireEvent.click(templatesTab)
      
      const nameInput = screen.getByPlaceholderText('e.g., Standard Weekday')
      fireEvent.change(nameInput, { target: { value: 'Test Template' } })
      
      const createButton = screen.getByText('Create Template')
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/schedule/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test Template')
        })
      })
    })

    it('handles adding time slots to template', () => {
      render(<AdvancedScheduleManager />)
      
      const templatesTab = screen.getByText('Templates')
      fireEvent.click(templatesTab)
      
      const addSlotButton = screen.getByText('Add Time Slot')
      fireEvent.click(addSlotButton)
      
      // Should add a new time slot input
      const timeInputs = screen.getAllByDisplayValue('09:00')
      expect(timeInputs.length).toBeGreaterThan(1)
    })
  })

  describe('Bulk Operations Tab', () => {
    it('displays bulk operations tab content', () => {
      render(<AdvancedScheduleManager />)
      
      const bulkTab = screen.getByText('Bulk Operations')
      fireEvent.click(bulkTab)
      
      expect(screen.getByText('Bulk Operations')).toBeInTheDocument()
      expect(screen.getByText('Start Date')).toBeInTheDocument()
      expect(screen.getByText('End Date')).toBeInTheDocument()
    })

    it('handles bulk operation execution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)
      
      render(<AdvancedScheduleManager />)
      
      const bulkTab = screen.getByText('Bulk Operations')
      fireEvent.click(bulkTab)
      
      const startDateInput = screen.getByDisplayValue('')
      fireEvent.change(startDateInput, { target: { value: '2024-01-15' } })
      
      const executeButton = screen.getByText('Execute Bulk Operation')
      fireEvent.click(executeButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/admin/schedule/bulk-operations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('2024-01-15')
        })
      })
    })

    it('handles operation type selection', () => {
      render(<AdvancedScheduleManager />)
      
      const bulkTab = screen.getByText('Bulk Operations')
      fireEvent.click(bulkTab)
      
      const operationSelect = screen.getByDisplayValue('Copy from template')
      fireEvent.change(operationSelect, { target: { value: 'delete' } })
      
      expect(operationSelect).toHaveValue('delete')
    })
  })

  describe('Analytics Tab', () => {
    it('displays analytics tab content', async () => {
      const mockAnalytics = {
        totalSlots: 100,
        availableSlots: 75,
        bookedSlots: 25,
        utilizationRate: 25
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ analytics: mockAnalytics })
      } as Response)
      
      render(<AdvancedScheduleManager />)
      
      const analyticsTab = screen.getByText('Analytics')
      fireEvent.click(analyticsTab)
      
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument()
        expect(screen.getByText('75')).toBeInTheDocument()
        expect(screen.getByText('25')).toBeInTheDocument()
        expect(screen.getByText('25%')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when store has error', () => {
      mockUseScheduleStore.mockReturnValue({
        ...mockStoreData,
        error: 'Failed to load schedule'
      })
      
      render(<AdvancedScheduleManager />)
      
      expect(screen.getByText('Failed to load schedule')).toBeInTheDocument()
    })

    it('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' })
      } as Response)
      
      render(<AdvancedScheduleManager />)
      
      const templatesTab = screen.getByText('Templates')
      fireEvent.click(templatesTab)
      
      const nameInput = screen.getByPlaceholderText('e.g., Standard Weekday')
      fireEvent.change(nameInput, { target: { value: 'Test Template' } })
      
      const createButton = screen.getByText('Create Template')
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading state when store is loading', () => {
      mockUseScheduleStore.mockReturnValue({
        ...mockStoreData,
        isLoading: true,
        weekOverview: []
      })
      
      render(<AdvancedScheduleManager />)
      
      expect(screen.getByText('Loading schedule...')).toBeInTheDocument()
    })

    it('shows loading state during bulk operations', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        } as Response), 1000)
      }))
      
      render(<AdvancedScheduleManager />)
      
      const bulkTab = screen.getByText('Bulk Operations')
      fireEvent.click(bulkTab)
      
      const executeButton = screen.getByText('Execute Bulk Operation')
      fireEvent.click(executeButton)
      
      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<AdvancedScheduleManager />)
      
      const tabList = screen.getByRole('tablist')
      expect(tabList).toBeInTheDocument()
      
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(4)
      
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected')
      })
    })

    it('supports keyboard navigation', () => {
      render(<AdvancedScheduleManager />)
      
      const firstTab = screen.getByText('Schedule')
      firstTab.focus()
      
      fireEvent.keyDown(firstTab, { key: 'ArrowRight' })
      
      const secondTab = screen.getByText('Templates')
      expect(secondTab).toHaveFocus()
    })
  })

  describe('Responsive Design', () => {
    it('adapts to different screen sizes', () => {
      // Mock window resize
      global.innerWidth = 768
      global.dispatchEvent(new Event('resize'))
      
      render(<AdvancedScheduleManager />)
      
      // Should show responsive grid classes
      const weekOverview = screen.getByText('Week Overview').closest('div')
      expect(weekOverview).toHaveClass('grid-cols-1', 'md:grid-cols-7')
    })
  })
})