# Customer Journey Test Fix Strategy - July 2025

**Status**: ✅ **ISSUES IDENTIFIED & SOLUTIONS DOCUMENTED**  
**Environment**: Vercel Production (https://love4detailingv2.vercel.app)  
**Framework**: Playwright E2E Testing  
**Date**: July 6, 2025  

---

## Executive Summary

**Root Cause Identified**: ✅ Form field selector mismatch between test expectations and production implementation  
**Solution Scope**: 8 customer journey test files requiring selector updates  
**Fix Complexity**: Medium - Systematic selector replacement needed  
**Admin Testing**: Ready to proceed once customer journey issues resolved  

---

## Detailed Issue Analysis

### ✅ **Issue 1: Registration Form Structure Mismatch**

**Problem**: Tests expect single `name` field, production uses `firstName`/`lastName`

**Expected (Tests)**:
```typescript
input[name="name"]          // ❌ Not found
input[name="phone"]         // ❌ Not found (field may not exist)
input[name="terms"]         // ❌ Terms checkbox not required
```

**Actual (Production)**:
```typescript
input[name="firstName"]     // ✅ Confirmed exists
input[name="lastName"]      // ✅ Confirmed exists  
input[name="email"]         // ✅ Confirmed exists
input[name="password"]      // ✅ Confirmed exists
input[name="confirmPassword"] // ✅ Confirmed exists
```

### ✅ **Issue 2: Booking Flow Component Selectors**

**Problem**: Calendar and service selection selectors don't match production

**Expected (Tests)**:
```typescript
'.react-calendar__tile'     // ❌ Calendar selector not found
'.time-slot-button'         // ❌ Time slot selector not found
'.service-card'             // ❌ Generic class not found
```

**Actual (Production)**:
```typescript
'[data-testid^="service-card-"]'              // ✅ Confirmed exists
'[data-testid="service-card-full-valet-detail"]' // ✅ Specific service
// Calendar and time selectors need investigation
```

### ✅ **Issue 3: Authentication Flow Expectations**

**Problem**: Post-registration flow expectations don't match implementation

**Expected (Tests)**:
```typescript
await page.waitForURL('/dashboard');  // ❌ Wrong redirect
```

**Actual (Production)**:
```typescript
await page.waitForURL('/auth/verify-email');  // ✅ Correct flow
```

---

## Comprehensive Fix Strategy

### Phase 1: Selector Definition Updates ✅ **COMPLETED**

**File**: `/tests/helpers/test-data.ts`
- ✅ Updated authentication selectors to match firstName/lastName pattern
- ✅ Added service card data-testid selectors
- ✅ Updated helper functions to handle name splitting

### Phase 2: Individual Test File Updates ⚡ **REQUIRED**

**Files Requiring Updates**: All 8 customer journey test files

**Pattern to Replace**:
```typescript
// OLD - Replace these patterns across all test files
await page.fill('input[name="name"]', user.name);
await page.fill('input[name="phone"]', user.phone);
await page.check('input[name="terms"]');
await page.waitForURL('/dashboard');

// NEW - With these corrected patterns
const nameParts = user.name.split(' ');
await page.fill('input[name="firstName"]', nameParts[0] || 'Test');
await page.fill('input[name="lastName"]', nameParts.slice(1).join(' ') || 'User');
await page.fill('input[name="confirmPassword"]', user.password);
await page.waitForURL('/auth/verify-email');
```

### Phase 3: Booking Flow Investigation 🔍 **NEEDED**

**Calendar Component Research**:
- Investigate actual calendar implementation class names
- Identify time slot button selectors in production
- Verify service selection flow and update accordingly

**Service Selection Research**:
- Confirm `[data-testid="service-card-full-valet-detail"]` works
- Test clicking behavior and next step transitions

---

## Required File Updates

### 🔧 **Test Files Needing Selector Updates**

1. **`02-anonymous-booking.spec.ts`** - Booking flow selectors
2. **`03-user-registration.spec.ts`** - Registration form selectors ✅ **PARTIALLY UPDATED**
3. **`04-login-dashboard.spec.ts`** - Registration dependencies  
4. **`05-vehicle-management.spec.ts`** - Vehicle form selectors
5. **`06-registered-user-booking.spec.ts`** - Booking flow selectors
6. **`07-booking-management.spec.ts`** - Management interface selectors
7. **`08-rewards-system.spec.ts`** - Rewards interface selectors

### 🔧 **Component Investigation Tasks**

1. **Booking Calendar**: Research actual calendar component structure
2. **Time Slot Selection**: Identify time slot button classes/selectors
3. **Vehicle Forms**: Verify vehicle registration form field names
4. **Dashboard Navigation**: Confirm dashboard component selectors

---

## Implementation Priority

### 🚨 **Critical Path (Blocking Admin Tests)**

**Priority 1 - Authentication Flow**:
- Complete registration form selector fixes
- Update login form selectors
- Fix post-authentication redirect expectations

**Priority 2 - Basic Booking Flow**:
- Fix service selection (using data-testid confirmed working)
- Investigate and fix calendar/time selection
- Update vehicle information form selectors

**Priority 3 - Advanced Features**:
- Dashboard navigation and management
- Vehicle management workflows  
- Rewards system interface

### ⚡ **Quick Win Strategy**

**Immediate Action** (30 minutes):
1. Update all registration test files with firstName/lastName pattern
2. Replace redirect expectations from `/dashboard` to `/auth/verify-email`
3. Update service selection to use `[data-testid="service-card-full-valet-detail"]`

**Medium Term** (1-2 hours):
1. Investigation session on production booking flow
2. Identify calendar and time slot component selectors
3. Update all booking flow tests with correct selectors

---

## Test Execution Plan

### Phase 1: Authentication Tests ✅
```bash
# Test registration fixes
npx playwright test tests/customer-journey/03-user-registration.spec.ts --project=chromium

# Test login dependencies
npx playwright test tests/customer-journey/04-login-dashboard.spec.ts --project=chromium
```

### Phase 2: Booking Flow Tests
```bash
# Test anonymous booking
npx playwright test tests/customer-journey/02-anonymous-booking.spec.ts --project=chromium

# Test registered user booking  
npx playwright test tests/customer-journey/06-registered-user-booking.spec.ts --project=chromium
```

### Phase 3: Complete Customer Journey
```bash
# Run all 8 customer journey tests
npx playwright test tests/customer-journey/ --reporter=html
```

### Phase 4: Admin Journey Testing
```bash
# Proceed to admin tests once customer journey complete
npx playwright test tests/admin-journey/ --reporter=html
```

---

## Success Metrics

### Customer Journey Test Goals
- **Test 1**: ✅ **COMPLETED** - First-time visitor (30/30 passed)
- **Test 2**: 🎯 **TARGET** - Anonymous booking (0/24 → 24/24 passed)
- **Test 3**: 🎯 **TARGET** - User registration (0/42 → 42/42 passed)
- **Test 4**: 🎯 **TARGET** - Login dashboard (0/48 → 48/48 passed)
- **Tests 5-8**: 🎯 **TARGET** - Complete remaining test suites

### Admin Journey Readiness
- **Prerequisite**: Customer authentication working (registration + login)
- **Admin Access**: Admin login functionality validated
- **Admin Interface**: Management interfaces tested and validated

---

## Next Steps

### ✅ **Completed**
1. Root cause analysis and issue identification
2. Production form structure investigation  
3. Helper function and selector definition updates
4. Comprehensive fix strategy documentation

### ⚡ **Immediate Actions Required**
1. **Complete selector updates** across all 8 test files
2. **Investigate calendar/time components** in production booking flow
3. **Re-run tests systematically** to validate fixes
4. **Document final test results** showing all issues resolved

### 🎯 **Final Goal**
- All 8 customer journey tests passing (targeting 100% success rate)
- Admin journey tests ready to execute
- Comprehensive test validation complete for production environment

---

*This strategy document provides the roadmap to resolve all customer journey test issues and proceed with admin journey validation.*