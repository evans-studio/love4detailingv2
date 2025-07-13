# Bug Report: Infinite Loop Fix for EnhancedScheduleManager

## Problem Analysis

The infinite loop in `EnhancedScheduleManager` is caused by:
1. Circuit breaker calling `setIsCircuitBroken()` during render (line 41)
2. Cascading useEffect dependencies between initialization, auto-selection, and data loading
3. Store actions triggering dual API calls (`loadWeekOverview()` + `loadDaySlots()`) 
4. Multiple state subscriptions causing excessive re-renders

## Solution: Targeted Fixes Maintaining Database-First Architecture

### 1. Fix Circuit Breaker (Primary Issue)

**Problem**: Circuit breaker triggers state updates during render
**Solution**: Move circuit breaker logic to useEffect

```typescript
// BEFORE (Causes infinite loop)
if (renderCount.current > 20 && timeSinceLastRender < 2000 && !isCircuitBroken) {
  setIsCircuitBroken(true)  // ❌ State update during render
}

// AFTER (Fixed)
useEffect(() => {
  const now = Date.now()
  const timeSinceLastRender = now - lastRenderTime.current
  
  if (renderCount.current > 20 && timeSinceLastRender < 2000 && !isCircuitBroken) {
    console.error('🚨 Circuit breaker activated - infinite loop detected')
    setIsCircuitBroken(true)
    
    const resetTimer = setTimeout(() => {
      renderCount.current = 0
      setIsCircuitBroken(false)
    }, 10000)
    
    return () => clearTimeout(resetTimer)
  }
  
  lastRenderTime.current = now
}, [isCircuitBroken])
```

### 2. Stabilize Effect Dependencies

**Problem**: Effects form circular dependency chain
**Solution**: Use stable refs and prevent cascading effects

```typescript
// BEFORE (Cascading effects)
useEffect(() => {
  if (!selectedDate && weekOverview.length > 0 && !hasAutoSelected) {
    setSelectedDate(today)  // Triggers selectedDate effect
  }
}, [selectedDate, weekOverview, hasAutoSelected, setSelectedDate])

// AFTER (Stable dependencies)
const initializationRef = useRef(false)

useEffect(() => {
  if (!initializationRef.current && weekOverview.length > 0 && !selectedDate) {
    initializationRef.current = true
    const today = new Date().toISOString().split('T')[0]
    const todayInWeek = weekOverview.find(day => day.day_date === today)
    
    if (todayInWeek) {
      setSelectedDate(today)
    } else if (weekOverview[0]) {
      setSelectedDate(weekOverview[0].day_date)
    }
  }
}, [weekOverview.length, selectedDate, setSelectedDate])
```

### 3. Optimize Store Actions (Database-First Preserved)

**Problem**: Dual API calls on every mutation
**Solution**: Conditional refreshes and debouncing

```typescript
// Enhanced mutation actions with selective refresh
toggleWorkingDayEnhanced: async (date: string, isWorking: boolean) => {
  const state = get()
  const mutationKey = `toggle_${date}`
  
  // Phase 1: Optimistic update (unchanged)
  set((draft) => {
    draft.mutations[mutationKey] = { isLoading: true, ... }
    // Optimistic update logic...
  })

  try {
    // Phase 2: API call (unchanged)
    const response = await fetch('/api/admin/schedule', { ... })
    
    // Phase 3: SELECTIVE refresh (NEW)
    const freshState = get()
    const refreshPromises = []
    
    // Always refresh week overview
    refreshPromises.push(freshState.loadWeekOverview())
    
    // Only refresh day slots if this date is selected
    if (freshState.selectedDate === date) {
      refreshPromises.push(freshState.loadDaySlots(date))
    }
    
    await Promise.all(refreshPromises)
    
    // Phase 4: Success state (unchanged)
    set((draft) => {
      delete draft.optimisticUpdates[mutationKey]
      draft.mutations[mutationKey] = { isLoading: false, ... }
    })
    
  } catch (error) {
    // Rollback logic unchanged
  }
}
```

### 4. Debounce Data Loading

**Problem**: Rapid successive data loads
**Solution**: Debounce mechanism in store

```typescript
// Add debounce utility to store
const loadingDebounce = new Map<string, NodeJS.Timeout>()

loadDaySlots: async (date: string) => {
  // Clear existing debounce
  const existingTimer = loadingDebounce.get('daySlots')
  if (existingTimer) {
    clearTimeout(existingTimer)
  }
  
  // Debounce the actual load
  return new Promise((resolve, reject) => {
    const timer = setTimeout(async () => {
      try {
        // Existing loadDaySlots logic...
        set((draft) => {
          draft.mutations.loadDaySlots = { isLoading: true, ... }
        })
        
        const response = await fetch(`/api/admin/schedule?action=get_day_slots&date=${date}`)
        // ... rest of logic
        
        loadingDebounce.delete('daySlots')
        resolve(undefined)
      } catch (error) {
        loadingDebounce.delete('daySlots')
        reject(error)
      }
    }, 150) // 150ms debounce
    
    loadingDebounce.set('daySlots', timer)
  })
}
```

### 5. Optimize Selectors

**Problem**: Selector cache invalidation
**Solution**: More stable cache keys

```typescript
// BEFORE (Cache always invalidated)
const mutationsStr = JSON.stringify(Object.keys(state.mutations).sort())
const cached = selectorCache.get(cacheKey + mutationsStr)

// AFTER (Stable cache keys)
export const scheduleSelectors = {
  isLoading: (state: ScheduleState) => {
    const loadingStates = Object.values(state.mutations).map(m => m.isLoading)
    const cacheKey = `isLoading_${loadingStates.join('_')}`
    const cached = selectorCache.get(cacheKey)
    
    if (cached !== undefined) return cached
    
    const result = loadingStates.some(Boolean)
    selectorCache.set(cacheKey, result)
    
    // Clean cache periodically
    if (selectorCache.size > 100) {
      selectorCache.clear()
    }
    
    return result
  }
}
```

### 6. Component Render Optimization

**Problem**: Excessive re-renders
**Solution**: Memoize expensive computations

```typescript
// Enhanced memoization in component
const memoizedWeekOverview = useMemo(() => weekOverview, [weekOverview])
const memoizedDaySlots = useMemo(() => 
  [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time)), 
  [daySlots]
)
const memoizedSelectedDate = useMemo(() => selectedDate, [selectedDate])

// Stable callback references
const handleRefresh = useCallback(async () => {
  try {
    await refreshData()
  } catch (error) {
    console.error('Failed to refresh data:', error)
  }
}, [refreshData])
```

## Implementation Priority

1. **CRITICAL**: Fix circuit breaker state updates during render
2. **HIGH**: Stabilize effect dependencies with refs
3. **MEDIUM**: Implement selective refresh in store actions
4. **LOW**: Add debouncing and selector optimization

## Database-First Architecture Preserved

- All data mutations still go through database first
- Optimistic updates maintained for UX
- RLS and security patterns unchanged
- API endpoints unchanged
- Database schema unchanged

## Testing Strategy

1. Test circuit breaker no longer triggers during normal operation
2. Verify effects don't cascade unnecessarily
3. Confirm database consistency maintained
4. Performance test with rapid user interactions
5. Verify all existing functionality works

This fix targets the specific causes of the infinite loop while maintaining the robust database-first architecture and enterprise-grade patterns.