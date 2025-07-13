# Rebuild Schedule Manager - Step by Step Guide

## Starting Point: MinimalScheduleManager

The `MinimalScheduleManager` is a completely static, read-only component with:
- ✅ No state management
- ✅ No useEffect hooks  
- ✅ No API calls
- ✅ No interactivity
- ✅ Static mock data only

**Test this first**: Verify it renders without any infinite loops or errors.

---

## Step 1: Add Basic State Management

**Objective**: Replace static data with useState hooks

### Changes to make:
```typescript
// Replace static data with state
const [weekOverview, setWeekOverview] = useState(MOCK_WEEK_OVERVIEW)
const [daySlots, setDaySlots] = useState(MOCK_DAY_SLOTS)
const [selectedDate, setSelectedDate] = useState('2024-01-01')
const [isLoading, setIsLoading] = useState(false)
```

### Testing:
- ✅ Component still renders
- ✅ No infinite loops
- ✅ No console errors
- ✅ Data displays correctly

**If infinite loops occur**: Remove the change and investigate state initialization patterns.

---

## Step 2: Add Manual Data Loading

**Objective**: Add API calls triggered by user action only

### Changes to make:
```typescript
const [isInitialized, setIsInitialized] = useState(false)

const handleLoadData = useCallback(async () => {
  setIsLoading(true)
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setWeekOverview(MOCK_WEEK_OVERVIEW)
    setIsInitialized(true)
  } catch (error) {
    console.error('Failed to load data:', error)
  } finally {
    setIsLoading(false)
  }
}, [])

// Replace the "Read Only" button with:
<Button onClick={handleLoadData} disabled={isLoading}>
  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
  {isLoading ? 'Loading...' : 'Load Data'}
</Button>
```

### Testing:
- ✅ Button click loads data
- ✅ Loading state works
- ✅ No infinite loops during loading
- ✅ Data appears after loading

**If infinite loops occur**: Check useCallback dependencies and ensure no automatic triggering.

---

## Step 3: Add Day Selection

**Objective**: Allow users to click day cards to select them

### Changes to make:
```typescript
const handleSelectDate = useCallback((date: string) => {
  setSelectedDate(date)
  // Update day slots for selected date (mock for now)
  if (date === '2024-01-01') {
    setDaySlots(MOCK_DAY_SLOTS)
  } else {
    setDaySlots([]) // Empty for other dates
  }
}, [])

// Add click handler to day cards:
<Card
  key={day.day_date}
  className={`cursor-pointer transition-all duration-200 ${
    selectedDate === day.day_date
      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
      : 'border-border hover:border-primary/50'
  }`}
  onClick={() => handleSelectDate(day.day_date)}
>
```

### Testing:
- ✅ Day cards are clickable
- ✅ Selection state updates visually
- ✅ Day slots change when selecting different days
- ✅ No infinite loops on selection

**If infinite loops occur**: Check that handleSelectDate doesn't trigger other state updates.

---

## Step 4: Add Real API Integration

**Objective**: Replace mock data with real API calls

### Changes to make:
```typescript
const loadWeekOverview = useCallback(async () => {
  setIsLoading(true)
  try {
    const response = await fetch('/api/admin/schedule?action=get_week_overview')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    if (data.error) throw new Error(data.error)
    
    setWeekOverview(data.data || [])
  } catch (error) {
    console.error('Failed to load week overview:', error)
    // Fallback to mock data
    setWeekOverview(MOCK_WEEK_OVERVIEW)
  } finally {
    setIsLoading(false)
  }
}, [])

const loadDaySlots = useCallback(async (date: string) => {
  setIsLoading(true)
  try {
    const response = await fetch(`/api/admin/schedule?action=get_day_slots&date=${date}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    if (data.error) throw new Error(data.error)
    
    setDaySlots(data.data || [])
  } catch (error) {
    console.error('Failed to load day slots:', error)
    setDaySlots([])
  } finally {
    setIsLoading(false)
  }
}, [])

// Update handlers:
const handleLoadData = useCallback(async () => {
  await loadWeekOverview()
  setIsInitialized(true)
}, [loadWeekOverview])

const handleSelectDate = useCallback(async (date: string) => {
  setSelectedDate(date)
  await loadDaySlots(date)
}, [loadDaySlots])
```

### Testing:
- ✅ Real data loads from API
- ✅ Day selection loads real slots
- ✅ Error handling works for failed requests
- ✅ No infinite loops with API calls

**If infinite loops occur**: Check that API calls don't trigger other state updates automatically.

---

## Step 5: Add Working Day Toggle

**Objective**: Allow toggling working days on/off

### Changes to make:
```typescript
const [togglingDays, setTogglingDays] = useState(new Set())

const toggleWorkingDay = useCallback(async (date: string, isWorking: boolean) => {
  setTogglingDays(prev => new Set(prev).add(date))
  
  try {
    const response = await fetch('/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'toggle_working_day',
        date,
        is_working: isWorking
      })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    if (data.error) throw new Error(data.error)

    // Update local state
    setWeekOverview(prev => prev.map(day => 
      day.day_date === date 
        ? { ...day, is_working_day: isWorking }
        : day
    ))
  } catch (error) {
    console.error('Failed to toggle working day:', error)
  } finally {
    setTogglingDays(prev => {
      const newSet = new Set(prev)
      newSet.delete(date)
      return newSet
    })
  }
}, [])

// Update day card checkbox:
<input
  type="checkbox"
  checked={day.is_working_day}
  onChange={(e) => toggleWorkingDay(day.day_date, e.target.checked)}
  disabled={togglingDays.has(day.day_date)}
  className="w-4 h-4"
/>
```

### Testing:
- ✅ Toggle switches work
- ✅ Loading states show during toggle
- ✅ Local state updates immediately
- ✅ No infinite loops during toggle operations

**If infinite loops occur**: Ensure toggle doesn't trigger automatic data reloading.

---

## Step 6: Add Slot Management

**Objective**: Add ability to add and delete time slots

### Changes to make:
```typescript
const [addSlotForm, setAddSlotForm] = useState({
  slot_date: '',
  start_time: '',
  duration_minutes: 120,
  max_bookings: 1,
})
const [isAddingSlot, setIsAddingSlot] = useState(false)
const [deletingSlots, setDeletingSlots] = useState(new Set())

const addSlot = useCallback(async (slotData) => {
  setIsAddingSlot(true)
  try {
    const response = await fetch('/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_slot',
        ...slotData
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error)

    // Refresh current day slots
    if (selectedDate) {
      await loadDaySlots(selectedDate)
    }
    
    // Reset form
    setAddSlotForm({
      slot_date: selectedDate || '',
      start_time: '',
      duration_minutes: 120,
      max_bookings: 1,
    })
  } catch (error) {
    console.error('Failed to add slot:', error)
  } finally {
    setIsAddingSlot(false)
  }
}, [selectedDate, loadDaySlots])

const deleteSlot = useCallback(async (slotId) => {
  setDeletingSlots(prev => new Set(prev).add(slotId))
  try {
    const response = await fetch('/api/admin/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_slot',
        slot_id: slotId
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error)

    // Remove from local state
    setDaySlots(prev => prev.filter(slot => slot.slot_id !== slotId))
  } catch (error) {
    console.error('Failed to delete slot:', error)
  } finally {
    setDeletingSlots(prev => {
      const newSet = new Set(prev)
      newSet.delete(slotId)
      return newSet
    })
  }
}, [])
```

### Testing:
- ✅ Add slot form works
- ✅ Slots can be deleted
- ✅ Local state updates correctly
- ✅ No infinite loops during slot operations

**If infinite loops occur**: Check that slot operations don't trigger cascading reloads.

---

## Step 7: Add Error Handling

**Objective**: Add comprehensive error handling and user feedback

### Changes to make:
```typescript
const [errors, setErrors] = useState([])

const addError = useCallback((error) => {
  setErrors(prev => [...prev, error])
  setTimeout(() => {
    setErrors(prev => prev.filter(e => e !== error))
  }, 5000)
}, [])

// Add error display component:
{errors.length > 0 && (
  <Alert className="border-destructive/50 bg-destructive/10">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      <ul className="list-disc list-inside space-y-1 text-sm">
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
)}
```

### Testing:
- ✅ Errors display correctly
- ✅ Errors auto-dismiss after 5 seconds
- ✅ Multiple errors can be shown
- ✅ No infinite loops from error handling

---

## Step 8: Add Automatic Initialization (DANGER ZONE)

**Objective**: Make the component load data automatically on mount

⚠️ **This is where infinite loops typically occur!**

### Changes to make (VERY CAREFULLY):
```typescript
useEffect(() => {
  // Only run once on mount
  if (!isInitialized) {
    handleLoadData()
  }
}, []) // Empty dependency array - CRITICAL!

// DO NOT include handleLoadData in dependencies!
```

### Testing:
- ✅ Data loads automatically on component mount
- ✅ Only loads once
- ✅ **NO INFINITE LOOPS** - this is the critical test

**If infinite loops occur**: 
1. Remove the useEffect immediately
2. Check all dependencies
3. Ensure no circular references
4. Consider keeping manual loading

---

## Testing Protocol for Each Step

For each step, perform these tests:

### 1. Browser Console Check
```bash
# Open browser dev tools
# Check for:
- No error messages
- No warning messages about infinite loops
- No "maximum update depth exceeded" errors
```

### 2. Network Tab Check
```bash
# Monitor network requests
# Ensure:
- API calls happen when expected
- No excessive/repeated calls
- No calls triggered in loops
```

### 3. React DevTools Check
```bash
# Install React DevTools
# Monitor:
- Component re-render frequency
- State updates
- No rapid re-rendering patterns
```

### 4. Performance Check
```bash
# Watch for:
- High CPU usage
- Browser freezing
- Slow response times
```

---

## Rollback Strategy

If any step causes infinite loops:

1. **Immediately revert** the changes from that step
2. **Identify the root cause** before proceeding
3. **Test the simpler approach** first
4. **Consider alternative implementations**

### Common Issues and Solutions:

**Issue**: useEffect with missing dependencies
**Solution**: Add all dependencies or use useCallback

**Issue**: State updates triggering other state updates
**Solution**: Combine related state updates

**Issue**: API calls triggering other API calls
**Solution**: Make calls explicit and user-triggered

**Issue**: Store subscriptions causing cascading updates
**Solution**: Use local state instead of complex stores

---

## Final Integration

Once all steps pass testing individually:

1. **Replace the current EnhancedScheduleManager** with your rebuilt version
2. **Test the complete user workflow** end-to-end
3. **Monitor for any edge cases** or performance issues
4. **Document any patterns** that worked well or caused problems

This systematic approach ensures each piece of functionality is added safely without introducing infinite loops.