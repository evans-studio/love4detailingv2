# MCP_CHECKLIST.md – Love 4 Detailing v1.0

**Minimum Complete Product (MCP)** for Love 4 Detailing – backend + dashboard.

---

## ✅ PURPOSE

This MCP defines the minimum functionality required to deliver a working, testable version of the Love 4 Detailing platform. This covers user authentication, booking flows, calendar logic, vehicle and reward management, and admin access — with zero critical bugs or broken flows.

---

## 🧩 CORE MODULES

### 1. AUTHENTICATION (AUTH)
- [ ] New users can register (via booking or manually)
- [ ] Returning users can log in securely
- [ ] Password setup links must work reliably
- [ ] Auth state persists and gates dashboard access
- [ ] Dashboard is inaccessible to unauthenticated users

---

### 2. PUBLIC BOOKING FLOW
- [ ] Form starts with vehicle input → details → calendar → summary
- [ ] All booking data is saved: personal info, vehicle, size, time slot
- [ ] On success, user account is created or linked
- [ ] User is redirected to confirmation page with:
  - [ ] Booking details
  - [ ] Account setup if needed (or sign-in prompt)
- [ ] Reward points are applied on booking completion

---

### 3. DASHBOARD FLOW
- [ ] QuickBook calendar works
- [ ] Time slots pulled from existing `time_slots` table
- [ ] Pre-saved vehicles populate in dropdown
- [ ] Booking includes user info automatically (no retyping)
- [ ] Bookings are saved and shown in dashboard history
- [ ] Users can log out reliably

---

### 4. VEHICLES
- [ ] My Vehicles page loads successfully
- [ ] Vehicles saved to logged-in user’s profile
- [ ] User can add new vehicles
- [ ] User can remove vehicles

---

### 5. REWARDS
- [ ] Reward points are issued on booking (with user_id attached)
- [ ] Reward transactions saved per booking
- [ ] User can view reward points on dashboard
- [ ] Future redemption logic stubbed or placeholder

---

### 6. ADMIN VIEW (BASIC)
- [ ] Admin can view all bookings (even if basic table view)
- [ ] Admin can see user info attached to each booking
- [ ] Admin portal gated by role (or temporary hardcoded bypass)

---

### 7. STABILITY & UX
- [ ] All 404 routes removed or redirected cleanly
- [ ] Sidebar only displays working links
- [ ] State doesn’t reset unexpectedly on refresh
- [ ] Loading/error states are handled with clear feedback
- [ ] All booking-related API routes return correct data

---

### 8. DATABASE STRUCTURE
- [ ] `is_booked` fully replaces `is_available` in `time_slots`
- [ ] All tables include valid foreign key relationships:
  - [ ] `vehicles.user_id`
  - [ ] `bookings.user_id`
  - [ ] `rewards.user_id`
- [ ] All RLS policies working and returning correct results
- [ ] Old seed/test data cleared for final pass

---

## 🚦 DEPLOYMENT READY IF:
- ✅ Booking from **public form** works cleanly, with account creation
- ✅ Booking from **dashboard calendar** works for logged-in users
- ✅ Bookings show up in Supabase and user dashboards
- ✅ All pages and flows match assigned routes and roles
- ✅ No 404s, form errors, or critical regressions

---

_Last updated: July 04, 2025_
