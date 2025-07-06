import { writeFileSync } from 'fs'
import { format } from 'date-fns'

const features = [
  // Critical Path
  { id: 'CP-001', feature: 'Homepage loads', path: '/' },
  { id: 'CP-002', feature: 'Book button works', path: '/' },
  { id: 'CP-003', feature: 'Booking flow completes', path: '/book' },
  { id: 'CP-004', feature: 'Confirmation page shows', path: '/confirmation' },
  
  // Auth Flow
  { id: 'AUTH-001', feature: 'Sign up works', path: '/auth/sign-up' },
  { id: 'AUTH-002', feature: 'Sign in works', path: '/auth/sign-in' },
  { id: 'AUTH-003', feature: 'Password reset email sends', path: '/auth/reset-password' },
  
  // Dashboard
  { id: 'DASH-001', feature: 'Dashboard loads after login', path: '/dashboard' },
  { id: 'DASH-002', feature: 'Booking history shows', path: '/dashboard/bookings' },
  { id: 'DASH-003', feature: 'Vehicle management works', path: '/dashboard/vehicles' },
  { id: 'DASH-004', feature: 'Rewards page loads', path: '/dashboard/rewards' },
  
  // Admin
  { id: 'ADMIN-001', feature: 'Admin login works', path: '/auth/admin-login' },
  { id: 'ADMIN-002', feature: 'Admin dashboard loads', path: '/admin' },
  { id: 'ADMIN-003', feature: 'Booking management works', path: '/admin/bookings' },
  { id: 'ADMIN-004', feature: 'User management works', path: '/admin/users' },
]

const checklist = `# Vercel Deployment Test Checklist
Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}
Deployment URL: ___________________________

## Critical Path Testing

${features.map(f => `- [ ] ${f.id}: ${f.feature} (${f.path})`).join('\n')}

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

`

writeFileSync(`test-checklists/vercel-test-${format(new Date(), 'yyyy-MM-dd')}.md`, checklist)
console.log('✅ Test checklist generated!')