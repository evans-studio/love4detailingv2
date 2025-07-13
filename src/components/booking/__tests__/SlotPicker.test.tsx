import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TimeSlotPicker, TimeSlot } from '../SlotPicker'
import '@testing-library/jest-dom'

const mockSlots: TimeSlot[] = [
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
    displayOrder: 1,
    pricing: {
      base_price_pence: 8000,
      duration_minutes: 120,
      vehicle_size: 'medium'
    }
  },
  {
    id: '2',
    date: '2024-01-15',
    startTime: '12:00',
    endTime: '14:00',
    duration: 120,
    availableCapacity: 0,
    totalCapacity: 1,
    status: 'booked',
    category: 'popular',
    isStandard: true,
    displayOrder: 2,
    pricing: {
      base_price_pence: 8000,
      duration_minutes: 120,
      vehicle_size: 'medium'
    }
  },
  {
    id: '3',
    date: '2024-01-15',
    startTime: '14:00',
    endTime: '16:00',
    duration: 120,
    availableCapacity: 1,
    totalCapacity: 2,
    status: 'last_available',
    category: 'regular',
    isStandard: false,
    displayOrder: 3,
    pricing: {
      base_price_pence: 8000,
      duration_minutes: 120,
      vehicle_size: 'medium'
    }
  }
]

const mockProps = {
  slots: mockSlots,
  onSlotSelect: jest.fn(),
  onSlotDeselect: jest.fn(),
  selectedDate: '2024-01-15',
  showCapacity: true,
  showPricing: true
}

describe('TimeSlotPicker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly with slots', () => {
    render(<TimeSlotPicker {...mockProps} />)
    
    expect(screen.getByText('Standard Times')).toBeInTheDocument()
    expect(screen.getByText('Additional Times')).toBeInTheDocument()
    expect(screen.getByText('9:00 AM')).toBeInTheDocument()
    expect(screen.getByText('12:00 PM')).toBeInTheDocument()
    expect(screen.getByText('2:00 PM')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<TimeSlotPicker {...mockProps} loading={true} />)
    
    expect(screen.getByText('Loading available times...')).toBeInTheDocument()
  })

  it('shows error state', () => {
    render(<TimeSlotPicker {...mockProps} error="Failed to load slots" />)
    
    expect(screen.getByText('Unable to Load Times')).toBeInTheDocument()
    expect(screen.getByText('Failed to load slots')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    render(<TimeSlotPicker {...mockProps} slots={[]} />)
    
    expect(screen.getByText('No Times Available')).toBeInTheDocument()
  })

  it('calls onSlotSelect when slot is clicked', () => {
    render(<TimeSlotPicker {...mockProps} />)
    
    const availableSlot = screen.getByRole('button', { name: /9:00 AM to 11:00 AM, Available/ })
    fireEvent.click(availableSlot)
    
    expect(mockProps.onSlotSelect).toHaveBeenCalledWith(mockSlots[0])
  })

  it('calls onSlotDeselect when selected slot is clicked again', () => {
    render(<TimeSlotPicker {...mockProps} selectedSlot={mockSlots[0]} />)
    
    const selectedSlot = screen.getByRole('button', { name: /9:00 AM to 11:00 AM, Available/ })
    fireEvent.click(selectedSlot)
    
    expect(mockProps.onSlotDeselect).toHaveBeenCalled()
  })

  it('does not allow selection of fully booked slots', () => {
    render(<TimeSlotPicker {...mockProps} />)
    
    const bookedSlot = screen.getByRole('button', { name: /12:00 PM to 2:00 PM, Fully Booked/ })
    expect(bookedSlot).toHaveAttribute('aria-disabled', 'true')
  })

  it('shows capacity information when enabled', () => {
    render(<TimeSlotPicker {...mockProps} showCapacity={true} />)
    
    expect(screen.getByText('1 of 1 available')).toBeInTheDocument()
    expect(screen.getByText('1 of 2 available')).toBeInTheDocument()
  })

  it('shows pricing information when enabled', () => {
    render(<TimeSlotPicker {...mockProps} showPricing={true} />)
    
    expect(screen.getAllByText('£80.00')).toHaveLength(3)
  })

  it('handles keyboard navigation', async () => {
    render(<TimeSlotPicker {...mockProps} />)
    
    const firstSlot = screen.getByRole('button', { name: /9:00 AM to 11:00 AM, Available/ })
    firstSlot.focus()
    
    // Arrow right should move to next available slot
    fireEvent.keyDown(firstSlot, { key: 'ArrowRight' })
    
    await waitFor(() => {
      const lastSlot = screen.getByRole('button', { name: /2:00 PM to 4:00 PM, Last Available/ })
      expect(lastSlot).toHaveFocus()
    })
  })

  it('handles Enter key selection', () => {
    render(<TimeSlotPicker {...mockProps} />)
    
    const availableSlot = screen.getByRole('button', { name: /9:00 AM to 11:00 AM, Available/ })
    fireEvent.keyDown(availableSlot, { key: 'Enter' })
    
    expect(mockProps.onSlotSelect).toHaveBeenCalledWith(mockSlots[0])
  })

  it('handles Space key selection', () => {
    render(<TimeSlotPicker {...mockProps} />)
    
    const availableSlot = screen.getByRole('button', { name: /9:00 AM to 11:00 AM, Available/ })
    fireEvent.keyDown(availableSlot, { key: ' ' })
    
    expect(mockProps.onSlotSelect).toHaveBeenCalledWith(mockSlots[0])
  })

  it('displays selected slot summary', () => {
    render(<TimeSlotPicker {...mockProps} selectedSlot={mockSlots[0]} />)
    
    expect(screen.getByText('Selected Time')).toBeInTheDocument()
    expect(screen.getByText(/9:00 AM on/)).toBeInTheDocument()
  })

  it('applies accessibility mode styling', () => {
    render(<TimeSlotPicker {...mockProps} accessibilityMode={true} />)
    
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings[0]).toHaveClass('text-xl')
  })

  it('applies high contrast mode styling', () => {
    render(<TimeSlotPicker {...mockProps} highContrast={true} />)
    
    const availableSlot = screen.getByRole('button', { name: /9:00 AM to 11:00 AM, Available/ })
    expect(availableSlot).toHaveClass('border-4')
  })

  it('disables animations when reduceMotion is enabled', () => {
    render(<TimeSlotPicker {...mockProps} reduceMotion={true} />)
    
    const availableSlot = screen.getByRole('button', { name: /9:00 AM to 11:00 AM, Available/ })
    expect(availableSlot).toHaveClass('transition-none')
  })

  it('announces selection when enabled', async () => {
    render(<TimeSlotPicker {...mockProps} announceSelection={true} />)
    
    const availableSlot = screen.getByRole('button', { name: /9:00 AM to 11:00 AM, Available/ })
    fireEvent.click(availableSlot)
    
    // Check if announcement is made (this would require testing with screen reader)
    expect(mockProps.onSlotSelect).toHaveBeenCalledWith(mockSlots[0])
  })

  it('groups slots correctly', () => {
    render(<TimeSlotPicker {...mockProps} />)
    
    // Should have standard slots section
    expect(screen.getByText('Standard Times')).toBeInTheDocument()
    
    // Should have additional slots section
    expect(screen.getByText('Additional Times')).toBeInTheDocument()
  })

  it('sorts slots by display order', () => {
    const unsortedSlots = [...mockSlots].reverse()
    render(<TimeSlotPicker {...mockProps} slots={unsortedSlots} />)
    
    const slots = screen.getAllByRole('button', { name: /AM|PM/ })
    expect(slots[0]).toHaveTextContent('9:00 AM')
    expect(slots[1]).toHaveTextContent('12:00 PM')
  })

  it('shows correct status labels', () => {
    render(<TimeSlotPicker {...mockProps} />)
    
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.getByText('Fully Booked')).toBeInTheDocument()
    expect(screen.getByText('Last Available')).toBeInTheDocument()
  })

  it('shows correct category badges', () => {
    render(<TimeSlotPicker {...mockProps} />)
    
    expect(screen.getByText('Standard')).toBeInTheDocument()
    expect(screen.getByText('Popular')).toBeInTheDocument()
  })

  it('handles empty date gracefully', () => {
    render(<TimeSlotPicker {...mockProps} selectedDate={undefined} />)
    
    expect(screen.getByText('selected date')).toBeInTheDocument()
  })

  it('provides proper ARIA labels', () => {
    render(<TimeSlotPicker {...mockProps} />)
    
    const availableSlot = screen.getByRole('button', { name: /9:00 AM to 11:00 AM, Available/ })
    expect(availableSlot).toHaveAttribute('aria-label')
    expect(availableSlot).toHaveAttribute('aria-pressed')
    expect(availableSlot).toHaveAttribute('aria-disabled')
  })
})

describe('TimeSlotPicker Integration', () => {
  it('handles real user workflow', async () => {
    const onSlotSelect = jest.fn()
    const onSlotDeselect = jest.fn()
    
    render(
      <TimeSlotPicker
        {...mockProps}
        onSlotSelect={onSlotSelect}
        onSlotDeselect={onSlotDeselect}
      />
    )
    
    // User selects a slot
    const availableSlot = screen.getByRole('button', { name: /9:00 AM to 11:00 AM, Available/ })
    fireEvent.click(availableSlot)
    
    expect(onSlotSelect).toHaveBeenCalledWith(mockSlots[0])
    
    // Re-render with selected slot
    render(
      <TimeSlotPicker
        {...mockProps}
        selectedSlot={mockSlots[0]}
        onSlotSelect={onSlotSelect}
        onSlotDeselect={onSlotDeselect}
      />
    )
    
    // User deselects the slot
    const selectedSlot = screen.getByRole('button', { name: /9:00 AM to 11:00 AM, Available/ })
    fireEvent.click(selectedSlot)
    
    expect(onSlotDeselect).toHaveBeenCalled()
  })
})