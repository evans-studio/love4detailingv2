# Vercel Deployment Test Checklist
Generated: 2025-07-06 21:27
Deployment URL: ___________________________

## Critical Path Testing

- [ ] CP-001: Homepage loads (/)
- [ ] CP-002: Book button works (/)
- [ ] CP-003: Booking flow completes (/book)
- [ ] CP-004: Confirmation page shows (/confirmation)
- [ ] AUTH-001: Sign up works (/auth/sign-up)
- [ ] AUTH-002: Sign in works (/auth/sign-in)
- [ ] AUTH-003: Password reset email sends (/auth/reset-password)
- [ ] DASH-001: Dashboard loads after login (/dashboard)
- [ ] DASH-002: Booking history shows (/dashboard/bookings)
- [ ] DASH-003: Vehicle management works (/dashboard/vehicles)
- [ ] DASH-004: Rewards page loads (/dashboard/rewards)
- [ ] ADMIN-001: Admin login works (/auth/admin-login)
- [ ] ADMIN-002: Admin dashboard loads (/admin)
- [ ] ADMIN-003: Booking management works (/admin/bookings)
- [ ] ADMIN-004: User management works (/admin/users)

## API Endpoint Testing

- [ ] POST /api/bookings - Create booking
- [ ] GET /api/bookings - List bookings  
- [ ] POST /api/email - Send email
- [ ] GET /api/vehicle-sizes - Load pricing
- [ ] GET /api/time-slots - Load availability
- [ ] POST /api/auth/anonymous - Anonymous booking

## Error Scenarios

- [ ] Submit booking with missing data
- [ ] Access admin without auth
- [ ] Book unavailable time slot
- [ ] Invalid email format handling
- [ ] Database connection issues

## Performance Checks

- [ ] Page load time < 3s
- [ ] API response time < 1s
- [ ] No console errors
- [ ] No 404s in network tab
- [ ] Images load properly

## Mobile Testing

- [ ] Test on real iPhone
- [ ] Test on real Android
- [ ] Check responsive breakpoints
- [ ] Touch interactions work
- [ ] Mobile navigation works

## Email Testing

- [ ] Booking confirmation email
- [ ] Admin notification email
- [ ] Password reset email
- [ ] Account verification email

## Notes
_Add any issues found here_

