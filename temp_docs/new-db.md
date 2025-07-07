# Complete Love4Detailing App Rebuild Engineering Prompt

## 🎯 Executive Summary

Rebuild the Love4Detailing appointment booking system from the ground up to align with the new database schema, implementing commercial-grade user experiences, comprehensive authentication flows, and industry-standard business logic. This rebuild focuses on creating a white-label, multi-tenant ready platform suitable for enterprise deployment. ensure we a working strictly with the vercel enviroment (.env.produciton.)

---

## 📊 New Database Schema Reference

### Core Tables (15)
1. **users** - Authentication and profile management
2. **services** - Service catalog and definitions
3. **service_pricing** - Dynamic pricing by service/vehicle type
4. **vehicles** - Customer vehicle registry
5. **vehicle_photos** - Vehicle image management
6. **schedule_templates** - Recurring schedule patterns
7. **schedule_slots** - Template-based time slots
8. **available_slots** - Real-time availability tracking
9. **bookings** - Appointment management
10. **booking_notes** - Internal notes and customer communication
11. **customer_rewards** - Loyalty program management
12. **reward_transactions** - Points history and redemption
13. **booking_locks** - Race condition prevention
14. **api_rate_limits** - API security and throttling
15. **vehicle_model_registry** - Comprehensive vehicle database

### Computed Views (2)
- **booking_summaries**
- **User Statistics**

---

## 🗺️ User Journey Mapping

### 1. **First-Time User Journey (Guest/New Customer)**
```
Landing Page → Service Discovery → Pricing Calculator → 
Vehicle Input → Schedule Selection → Payment → 
Confirmation → Account Creation Modal → Dashboard
```

**Step-by-Step Flow:**
1. **Landing Page** (`/`) - Initial value proposition and CTAs
2. **Service Discovery** (`/services` or `/booking/services`) - Browse and select services
3. **Pricing Calculator** (`/pricing` or integrated) - See costs upfront
4. **Vehicle Input** (`/booking/vehicle`) - Registration lookup or manual entry
5. **Schedule Selection** (`/booking/schedule`) - Pick date and time
6. **Payment** (`/booking/payment`) - Process payment (still as guest)
7. **Confirmation** (`/booking/confirmation`) - Booking confirmed
8. **Account Creation Modal** - Prompted to create password
9. **Dashboard** (`/dashboard?welcome=true`) - Welcome flow for new users

**Progressive Data Collection:**
- **Services**: Service selection and add-ons
- **Pricing**: Transparent cost calculation 
- **Vehicle**: Registration + photos for accurate service
- **Schedule**: Date, time, and service location
- **Payment**: Customer details (name, email, phone) + payment
- **Post-booking**: Optional password creation for account access

**Business Logic:**
- No authentication required until post-booking
- Customer details collected during payment step
- Account created automatically with booking data
- Welcome rewards allocated immediately upon password creation
- Seamless transition to authenticated dashboard experience

### 2. **Returning Customer Journey**
```
Login → Dashboard → Quick Rebooking / New Booking → 
Saved Vehicles → Preferred Services → 
Loyalty Points Application → Schedule Selection → 
Payment (Saved Methods) → Confirmation → 
Post-Service Follow-up
```

**Personalization Requirements:**
- Booking history quick access
- Preferred service recommendations
- Saved payment methods
- Automatic loyalty point calculations
- Predictive rebooking suggestions

### 3. **Admin User Journey**
```
Admin Login → Dashboard Overview → 
Schedule Management → Booking Oversight → 
Customer Management → Service Configuration → 
Pricing Management → Analytics Review → 
Staff Coordination → Financial Reporting
```

**Admin Capabilities:**
- Real-time schedule manipulation
- Customer service tools
- Business analytics dashboard
- Revenue optimization tools
- Staff scheduling coordination

### 4. **Service Provider Journey**
```
Staff Login → Daily Schedule View → 
Route Optimization → Customer Information → 
Service Execution → Time Tracking → 
Notes Documentation → Service Completion → 
Next Appointment Navigation
```

---

## 🏗️ Application Architecture

### **Technology Stack**
```typescript
Frontend Framework: Next.js 14 (App Router)
Language: TypeScript (Strict Mode)
Styling: TailwindCSS + CSS Variables
UI Library: ShadCN/UI + Radix Primitives
State Management: Zustand + React Query
Authentication: Supabase Auth + RLS
Database: PostgreSQL (Supabase)
Real-time: Supabase Realtime
Email: Resend API
Payments: Stripe Connect (Multi-tenant)
File Storage: Supabase Storage
Deployment: Vercel (Frontend) + Supabase (Backend)
Monitoring: Sentry + Analytics
Testing: Vitest + Playwright + Testing Library
```

### **Project Structure**
```
src/
├── app/                              # Next.js App Router
│   ├── (auth)/                      # Auth-required routes
│   │   ├── dashboard/               # Customer portal
│   │   │   ├── page.tsx            # Main dashboard (welcome flow for new accounts)
│   │   │   ├── bookings/           # Booking management
│   │   │   ├── vehicles/           # Vehicle management
│   │   │   ├── rewards/            # Loyalty program
│   │   │   └── profile/            # Account settings
│   │   └── admin/                   # Admin portal
│   │       ├── page.tsx            # Admin dashboard
│   │       ├── schedule/           # Schedule management
│   │       ├── bookings/           # Booking oversight
│   │       ├── customers/          # Customer management
│   │       ├── services/           # Service configuration
│   │       ├── pricing/            # Dynamic pricing
│   │       ├── analytics/          # Business intelligence
│   │       └── settings/           # System configuration
│   ├── (public)/                    # Public routes (no auth required)
│   │   ├── page.tsx                # Landing page
│   │   ├── services/               # Service catalog
│   │   ├── pricing/                # Pricing calculator
│   │   ├── about/                  # Company information
│   │   ├── contact/                # Contact forms
│   │   └── booking/                # Complete guest booking flow
│   │       ├── services/           # Service discovery and selection
│   │       ├── pricing/            # Transparent pricing calculator  
│   │       ├── vehicle/            # Vehicle input and registration
│   │       ├── schedule/           # Date/time selection
│   │       ├── payment/            # Customer details + payment processing
│   │       └── confirmation/       # Booking confirmation + account creation modal
│   ├── auth/                        # Authentication flows
│   │   ├── login/                  # Sign in
│   │   ├── register/               # Sign up (optional entry point)
│   │   ├── forgot-password/        # Password reset
│   │   ├── verify-email/           # Email verification
│   │   └── callback/               # OAuth callbacks
│   ├── api/                         # API routes
│   │   ├── auth/                   # Authentication endpoints
│   │   │   ├── create-account/     # Post-booking account creation
│   │   │   └── welcome-rewards/    # Allocate new user rewards
│   │   ├── bookings/               # Booking management
│   │   ├── customers/              # Customer operations
│   │   ├── schedule/               # Schedule operations
│   │   ├── payments/               # Payment processing
│   │   ├── analytics/              # Business intelligence
│   │   ├── admin/                  # Admin operations
│   │   └── webhooks/               # External webhooks
│   └── globals.css                  # Global styles
├── components/                      # Reusable UI components
│   ├── ui/                         # Base UI components (ShadCN)
│   ├── forms/                      # Form components
│   ├── layout/                     # Layout components
│   ├── booking/                    # Booking-specific components
│   ├── dashboard/                  # Dashboard components
│   ├── admin/                      # Admin components
│   └── common/                     # Shared components
├── lib/                            # Utilities and configurations
│   ├── auth/                       # Authentication utilities
│   ├── database/                   # Database utilities
│   ├── services/                   # Business logic services
│   ├── validations/                # Zod schemas
│   ├── utils/                      # Helper functions
│   └── constants/                  # App constants
├── hooks/                          # Custom React hooks
├── stores/                         # Zustand stores
├── types/                          # TypeScript definitions
└── middleware.ts                   # Next.js middleware
```

---

## 🔐 Authentication & Authorization Architecture

### **Authentication Flow Design**

```typescript
// Simplified three-tier authentication system
interface AuthenticationSystem {
  // Public access (no auth required)
  public: [
    '/',                    // Landing page
    '/services',            // Service catalog
    '/pricing',             // Pricing calculator
    '/about',               // Company info
    '/contact',             // Contact forms
    '/booking/*'            // Complete booking flow (guest-friendly)
  ]
  
  // Customer access (authenticated users)
  customer: [
    '/dashboard',           // Customer portal
    '/profile',             // Account settings
    '/vehicles',            // Vehicle management
    '/bookings/*',          // Booking management
    '/rewards'              // Loyalty program
  ]
  
  // Admin access (elevated permissions)
  admin: [
    '/admin/*',             // Admin portal
    '/api/admin/*',         // Admin APIs
    '/analytics',           // Business intelligence
    '/system-settings'      // System configuration
  ]
  
  // Service provider access (field staff)
  provider: [
    '/mobile-dashboard',    // Mobile interface
    '/route-optimization',  // Route planning
    '/service-completion'   // Job completion
  ]
}
```

### **Row Level Security (RLS) Policies**

```sql
-- Users can only access their own data
CREATE POLICY "users_own_data" ON users
    FOR ALL USING (auth.uid() = id);

-- Customers can view available slots
CREATE POLICY "customers_view_available_slots" ON available_slots
    FOR SELECT USING (is_available = true);

-- Admins have full access
CREATE POLICY "admin_full_access" ON ALL TABLES
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Booking access control
CREATE POLICY "booking_access" ON bookings
    FOR ALL USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'provider')
        )
    );
```

---

## 📱 Page-by-Page Implementation Guide

### **1. Landing Page (`/`)**

**Purpose**: Convert visitors to customers
**Key Features**:
- Hero section with value proposition
- Service overview with pricing preview
- Customer testimonials and reviews
- Instant pricing calculator widget
- Clear call-to-action buttons

```typescript
// Landing page component structure
const LandingPage = () => {
  return (
    <>
      <HeroSection />
      <ServicePreview />
      <PricingCalculator />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </>
  )
}

// Key components needed:
- ServicePreviewCard
- PricingCalculatorWidget
- TestimonialCarousel
- FeatureHighlight
- TrustIndicators
```

### **2. Service Catalog (`/services`)**

**Purpose**: Detailed service information and education
**Key Features**:
- Comprehensive service descriptions
- Before/after photo galleries
- Duration and pricing information
- Add-on services selection
- FAQ section

```typescript
interface ServiceCatalogProps {
  services: Service[]
  pricing: ServicePricing[]
}

// Components needed:
- ServiceCard
- ServiceDetailModal
- PricingMatrix
- PhotoGallery
- AddOnSelector
- ServiceComparison
```

### **3. Guest-to-Customer Booking Flow (`/booking/*`)**

**Exact Flow Sequence:**
```typescript
interface BookingFlow {
  // Step 1: Service Discovery (/services or /booking/services)
  serviceDiscovery: {
    availableServices: Service[]
    serviceSelection: Service
    addOnServices: AddOnService[]
    serviceDescription: string
    estimatedDuration: number
  }

  // Step 2: Pricing Calculator (integrated or /pricing)
  pricingCalculator: {
    baseServicePrice: number
    addOnPricing: number[]
    vehicleSizeModifier: number
    totalEstimate: number
    transparentBreakdown: PriceBreakdown
  }

  // Step 3: Vehicle Input (/booking/vehicle)
  vehicleInput: {
    registrationLookup?: string
    manualEntry?: VehicleDetails
    vehiclePhotos: File[]
    specialNotes: string
    confirmedVehicleSize: VehicleSize
  }

  // Step 4: Schedule Selection (/booking/schedule)
  scheduleSelection: {
    availableDates: Date[]
    selectedDate: Date
    availableTimeSlots: AvailableSlot[]
    selectedTimeSlot: AvailableSlot
    serviceLocation: Address
    finalPricing: number
  }

  // Step 5: Payment Processing (/booking/payment)
  payment: {
    // Customer details collected here (not before)
    customerDetails: {
      fullName: string
      email: string
      phone: string
      serviceAddress: Address
    }
    
    // Payment processing
    paymentMethod: 'card' | 'cash_on_completion'
    stripePaymentIntent?: string
    bookingSubmission: BookingData
  }

  // Step 6: Confirmation + Account Creation (/booking/confirmation)
  postBookingFlow: {
    bookingConfirmation: {
      bookingReference: string
      serviceDetails: ServiceSummary
      scheduledDateTime: DateTime
      customerInstructions: string
    }
    
    accountCreationPrompt: {
      modalTrigger: 'automatic' // Shows immediately after confirmation
      customerEmail: string     // Pre-filled from payment step
      passwordCreation: {
        password: string
        confirmPassword: string
      }
      onAccountCreated: () => redirectTo('/dashboard?welcome=true&booking=' + bookingId)
      onSkip: () => showEmailInstructions()
    }
  }
}
```

**Key Flow Principles:**
- **Zero authentication** required until post-confirmation
- **Customer details** only collected at payment step
- **Transparent pricing** shown throughout entire journey  
- **Account creation** happens at perfect moment (post-booking success)
- **Immediate value** - dashboard access with booking details

### **4. Customer Dashboard (`/dashboard`)**

**Key Sections**:
```typescript
interface DashboardLayout {
  overview: {
    upcomingBookings: Booking[]
    recentActivity: Activity[]
    loyaltyStatus: RewardStatus
    quickActions: QuickAction[]
  }
  
  bookings: {
    active: Booking[]
    completed: Booking[]
    cancelled: Booking[]
    rebookingOptions: RebookOption[]
  }
  
  vehicles: {
    registeredVehicles: Vehicle[]
    addVehicleFlow: VehicleForm
    photoManagement: PhotoUpload
  }
  
  rewards: {
    currentPoints: number
    tierStatus: TierLevel
    pointsHistory: RewardTransaction[]
    availableRewards: RewardOption[]
  }
  
  profile: {
    personalInfo: UserProfile
    preferences: UserPreferences
    paymentMethods: PaymentMethod[]
    notificationSettings: NotificationPrefs
  }
}
```

### **5. Admin Portal (`/admin/*`)**

**Core Admin Pages**:

```typescript
// Schedule Management (/admin/schedule)
interface ScheduleManagement {
  templateManager: {
    weeklyTemplates: ScheduleTemplate[]
    createTemplate: TemplateForm
    editTemplate: TemplateEditForm
  }
  
  dailyOverrides: {
    calendarView: CalendarComponent
    dayConfigModal: DayConfigForm
    bulkUpdates: BulkUpdateForm
  }
  
  slotManagement: {
    realTimeSlots: AvailableSlot[]
    slotCreation: SlotForm
    slotModification: SlotEditForm
  }
}

// Booking Management (/admin/bookings)
interface BookingManagement {
  bookingOverview: {
    allBookings: Booking[]
    filterControls: BookingFilters
    bulkActions: BulkActionMenu
  }
  
  bookingDetails: {
    customerInfo: CustomerProfile
    serviceDetails: ServiceInfo
    paymentStatus: PaymentInfo
    internalNotes: NotesManager
  }
  
  schedulingTools: {
    rescheduleBooking: RescheduleForm
    cancelBooking: CancelForm
    noShowHandling: NoShowForm
  }
}

// Customer Management (/admin/customers)
interface CustomerManagement {
  customerDatabase: {
    allCustomers: Customer[]
    searchAndFilter: CustomerFilters
    customerSegmentation: SegmentView
  }
  
  customerProfile: {
    personalInfo: CustomerInfo
    bookingHistory: BookingHistory
    loyaltyStatus: RewardStatus
    communicationLog: CommunicationHistory
  }
  
  customerService: {
    addNotes: NoteForm
    sendMessage: MessageForm
    issueResolution: IssueTracker
  }
}
```

---

## 🔌 API Endpoint Architecture

### **Authentication Endpoints**
```typescript
// /api/auth/*
POST   /api/auth/register          // User registration
POST   /api/auth/login             // User login
POST   /api/auth/logout            // User logout
POST   /api/auth/forgot-password   // Password reset request
POST   /api/auth/reset-password    // Password reset completion
GET    /api/auth/verify-email      // Email verification
POST   /api/auth/refresh-token     // Token refresh
GET    /api/auth/me                // Current user info
```

### **Booking Management Endpoints**
```typescript
// /api/bookings/*
GET    /api/bookings                    // List user bookings
POST   /api/bookings                    // Create new booking
GET    /api/bookings/[id]               // Get booking details
PUT    /api/bookings/[id]               // Update booking
DELETE /api/bookings/[id]               // Cancel booking
POST   /api/bookings/[id]/reschedule    // Reschedule booking
POST   /api/bookings/[id]/complete      // Mark completed
GET    /api/bookings/available-slots    // Get available time slots
POST   /api/bookings/lock-slot          // Temporarily lock slot
POST   /api/bookings/calculate-price    // Price calculation
```

### **Customer Management Endpoints**
```typescript
// /api/customers/*
GET    /api/customers/profile           // Get customer profile
PUT    /api/customers/profile           // Update profile
GET    /api/customers/vehicles          // List vehicles
POST   /api/customers/vehicles          // Add vehicle
PUT    /api/customers/vehicles/[id]     // Update vehicle
DELETE /api/customers/vehicles/[id]     // Remove vehicle
GET    /api/customers/rewards           // Get loyalty status
POST   /api/customers/rewards/redeem    // Redeem points
GET    /api/customers/booking-history   // Get booking history
```

### **Admin Endpoints**
```typescript
// /api/admin/*
GET    /api/admin/dashboard             // Admin dashboard data
GET    /api/admin/analytics             // Business analytics
GET    /api/admin/customers             // All customers
GET    /api/admin/bookings              // All bookings
POST   /api/admin/schedule/template     // Create schedule template
PUT    /api/admin/schedule/template/[id] // Update template
POST   /api/admin/schedule/override     // Daily schedule override
GET    /api/admin/financial/reports     // Financial reporting
POST   /api/admin/services/pricing      // Update pricing
GET    /api/admin/system/health         // System health check
```

### **Payment Processing Endpoints**
```typescript
// /api/payments/*
POST   /api/payments/create-intent      // Stripe payment intent
POST   /api/payments/confirm-payment    // Confirm payment
POST   /api/payments/refund             // Process refund
GET    /api/payments/methods            // Saved payment methods
POST   /api/payments/methods            // Add payment method
DELETE /api/payments/methods/[id]       // Remove payment method
```

---

## 🎨 UI Component Library

### **Base Components (ShadCN/UI Extended)**
```typescript
// Form Components
- FormField (enhanced with validation)
- SearchableSelect (for vehicle selection)
- DateTimePicker (for booking scheduling)
- FileUpload (for vehicle photos)
- PriceInput (for admin pricing)
- PhoneInput (with country codes)
- AddressInput (with autocomplete)

// Data Display
- DataTable (with sorting/filtering)
- StatCard (for dashboard metrics)
- Timeline (for booking progress)
- Calendar (for schedule management)
- ImageGallery (for vehicle photos)
- PricingCard (service pricing display)

// Navigation
- Breadcrumbs (for complex flows)
- StepIndicator (for booking process)
- Sidebar (responsive admin sidebar)
- MobileNav (mobile navigation)

// Feedback
- LoadingStates (skeleton, spinner, progress)
- EmptyStates (no data, error states)
- SuccessMessages (booking confirmations)
- ErrorBoundary (error handling)

// Business-Specific
- VehicleCard (vehicle display)
- BookingCard (booking summary)
- ServiceCard (service selection)
- RewardsBadge (loyalty display)
- PaymentMethodCard (saved payments)
```

### **Composite Components**
```typescript
// Booking Components
interface BookingWizard {
  ServiceSelector: React.FC<ServiceSelectorProps>
  VehicleInput: React.FC<VehicleInputProps>
  SchedulePicker: React.FC<SchedulePickerProps>
  BookingSummary: React.FC<BookingSummaryProps>
  PaymentProcessor: React.FC<PaymentProcessorProps>
}

// Dashboard Components
interface DashboardComponents {
  OverviewCards: React.FC<OverviewCardsProps>
  BookingList: React.FC<BookingListProps>
  VehicleManager: React.FC<VehicleManagerProps>
  RewardsTracker: React.FC<RewardsTrackerProps>
  QuickActions: React.FC<QuickActionsProps>
}

// Admin Components
interface AdminComponents {
  ScheduleManager: React.FC<ScheduleManagerProps>
  CustomerDatabase: React.FC<CustomerDatabaseProps>
  AnalyticsDashboard: React.FC<AnalyticsDashboardProps>
  ServiceConfiguration: React.FC<ServiceConfigProps>
  PricingManager: React.FC<PricingManagerProps>
}
```

---

## 📊 State Management Architecture

### **Zustand Store Structure**
```typescript
// Authentication Store
interface AuthStore {
  user: User | null
  session: Session | null
  isLoading: boolean
  
  actions: {
    login: (credentials: LoginCredentials) => Promise<void>
    logout: () => Promise<void>
    register: (userData: RegisterData) => Promise<void>
    updateProfile: (updates: ProfileUpdates) => Promise<void>
  }
}

// Booking Store
interface BookingStore {
  currentBooking: BookingDraft | null
  bookingStep: BookingStep
  availableSlots: AvailableSlot[]
  
  actions: {
    initializeBooking: () => void
    updateBookingStep: (step: BookingStep, data: any) => void
    calculatePrice: () => Promise<number>
    submitBooking: () => Promise<BookingConfirmation>
    clearBooking: () => void
  }
}

// Vehicle Store
interface VehicleStore {
  vehicles: Vehicle[]
  selectedVehicle: Vehicle | null
  isLoading: boolean
  
  actions: {
    fetchVehicles: () => Promise<void>
    addVehicle: (vehicle: VehicleData) => Promise<void>
    updateVehicle: (id: string, updates: VehicleUpdates) => Promise<void>
    selectVehicle: (vehicle: Vehicle) => void
  }
}

// Admin Store
interface AdminStore {
  scheduleTemplates: ScheduleTemplate[]
  bookingOverview: BookingOverview
  customerMetrics: CustomerMetrics
  
  actions: {
    fetchDashboardData: () => Promise<void>
    updateScheduleTemplate: (template: ScheduleTemplate) => Promise<void>
    manageBooking: (bookingId: string, action: BookingAction) => Promise<void>
  }
}
```

---

## 🔄 Real-time Features Implementation

### **Live Updates with Supabase Realtime**
```typescript
// Real-time availability updates
const useRealTimeAvailability = (date: string) => {
  const [slots, setSlots] = useState<AvailableSlot[]>([])
  
  useEffect(() => {
    const subscription = supabase
      .channel('availability-updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'available_slots',
          filter: `date=eq.${date}`
        }, 
        (payload) => {
          // Update local state with real-time changes
          handleSlotUpdate(payload)
        }
      )
      .subscribe()
    
    return () => subscription.unsubscribe()
  }, [date])
}

// Real-time booking updates for admins
const useRealTimeBookings = () => {
  useEffect(() => {
    const subscription = supabase
      .channel('booking-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          // Update admin dashboard in real-time
          updateBookingsList(payload)
          showNotification(`New booking: ${payload.new.customer_name}`)
        }
      )
      .subscribe()
  }, [])
}
```

---

## 🧪 Testing Strategy

### **Testing Structure**
```typescript
// Unit Tests (Vitest)
__tests__/
├── components/           # Component unit tests
├── services/            # Business logic tests
├── utils/               # Utility function tests
└── hooks/               # Custom hook tests

// Integration Tests (Playwright)
e2e/
├── booking-flow.spec.ts      # Complete booking process
├── admin-dashboard.spec.ts   # Admin functionality
├── authentication.spec.ts   # Auth flows
└── payment-processing.spec.ts # Payment integration

// API Tests
api-tests/
├── auth.test.ts         # Authentication endpoints
├── bookings.test.ts     # Booking management
├── customers.test.ts    # Customer operations
└── admin.test.ts        # Admin endpoints
```

### **Test Coverage Requirements**
- **Unit Tests**: 90%+ coverage for business logic
- **Integration Tests**: All critical user flows
- **E2E Tests**: Complete user journeys
- **Performance Tests**: Page load times, API response times
- **Security Tests**: Authentication, authorization, data protection

---

## 🚀 Deployment & DevOps

### **Environment Configuration**
```typescript
// Environment variables structure
interface EnvironmentConfig {
  // Database
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  
  // Authentication
  NEXTAUTH_SECRET: string
  NEXTAUTH_URL: string
  
  // Payments
  STRIPE_PUBLIC_KEY: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  
  // Email
  RESEND_API_KEY: string
  
  // File Storage
  SUPABASE_STORAGE_BUCKET: string
  
  // Monitoring
  SENTRY_DSN: string
  
  // Feature Flags
  ENABLE_PAYMENT_PROCESSING: boolean
  ENABLE_LOYALTY_PROGRAM: boolean
  ENABLE_SMS_NOTIFICATIONS: boolean
}
```

### **Deployment Pipeline**
```yaml
# GitHub Actions workflow
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run Tests
        run: |
          npm run test:unit
          npm run test:integration
          npm run test:e2e
  
  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: vercel/action@v1
      
      - name: Run Database Migrations
        run: npx supabase db push
      
      - name: Smoke Tests
        run: npm run test:smoke
```

---

## 📈 Performance Optimization

### **Frontend Optimization**
```typescript
// Code splitting and lazy loading
const AdminDashboard = lazy(() => import('./admin/Dashboard'))
const BookingWizard = lazy(() => import('./booking/BookingWizard'))

// Image optimization
import Image from 'next/image'
const optimizedImages = {
  priority: true,
  quality: 85,
  formats: ['webp', 'avif']
}

// Caching strategy
const cacheConfig = {
  staticData: 300, // 5 minutes
  userProfile: 900, // 15 minutes
  availableSlots: 60 // 1 minute
}
```

### **Database Optimization**
```sql
-- Critical indexes for performance
CREATE INDEX idx_available_slots_date_time ON available_slots(date, start_time);
CREATE INDEX idx_bookings_user_date ON bookings(user_id, booking_date);
CREATE INDEX idx_vehicles_user ON vehicles(user_id);
CREATE INDEX idx_reward_transactions_user ON reward_transactions(user_id);

-- Composite indexes for common queries
CREATE INDEX idx_bookings_status_date ON bookings(status, booking_date);
CREATE INDEX idx_schedule_slots_template_day ON schedule_slots(template_id, day_of_week);
```

---

## 🔒 Security Implementation

### **Security Checklist**
```typescript
// Input validation and sanitization
import { z } from 'zod'

const BookingSchema = z.object({
  serviceId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  slotId: z.string().uuid(),
  notes: z.string().max(500).optional()
})

// Rate limiting
const rateLimitConfig = {
  bookingCreation: '5 per 15 minutes',
  authAttempts: '10 per hour',
  apiCalls: '1000 per hour'
}

// Data encryption
const sensitiveDataHandling = {
  paymentInfo: 'encrypted at rest',
  personalData: 'hashed where possible',
  communications: 'TLS in transit'
}
```

---

## 📋 Implementation Checklist

### **Phase 1: Foundation (Weeks 1-2)**
- [ ] Set up project structure and dependencies
- [ ] Configure database schema and migrations
- [ ] Implement authentication system
- [ ] Create base UI component library
- [ ] Set up state management stores

### **Phase 2: Core Features (Weeks 3-4)**
- [ ] Build landing page and service catalog
- [ ] Implement multi-step booking flow
- [ ] Create customer dashboard
- [ ] Develop vehicle management system
- [ ] Integrate payment processing

### **Phase 3: Admin Portal (Weeks 5-6)**
- [ ] Build admin dashboard
- [ ] Implement schedule management
- [ ] Create booking oversight tools
- [ ] Develop customer management system
- [ ] Add analytics and reporting

### **Phase 4: Advanced Features (Weeks 7-8)**
- [ ] Implement loyalty program
- [ ] Add real-time updates
- [ ] Create mobile-responsive design
- [ ] Integrate email notifications
- [ ] Add comprehensive search and filtering

### **Phase 5: Testing & Optimization (Weeks 9-10)**
- [ ] Complete test suite implementation
- [ ] Performance optimization
- [ ] Security audit and fixes
- [ ] Accessibility compliance
- [ ] Documentation completion

### **Phase 6: Deployment & Launch (Weeks 11-12)**
- [ ] Production deployment setup
- [ ] Environment configuration
- [ ] Monitoring and alerting
- [ ] User acceptance testing
- [ ] Go-live preparation

---

## 🎯 Success Metrics

### **Technical KPIs**
- Page load time: < 2 seconds
- API response time: < 200ms
- Uptime: 99.9%
- Test coverage: > 90%
- Core Web Vitals: All green

### **Business KPIs**
- Booking conversion rate: > 15%
- Customer retention: > 80%
- Average session duration: > 5 minutes
- Mobile usage: > 60%
- Customer satisfaction: > 4.5/5

### **User Experience KPIs**
- Booking completion rate: > 95%
- Form abandonment rate: < 10%
- Support ticket volume: < 2% of bookings
- Feature adoption rate: > 70%
- User engagement score: > 8/10

---

This comprehensive rebuild prompt ensures every aspect of the Love4Detailing application is rebuilt to commercial industry standards, with proper user journey mapping, robust architecture, and scalable implementation patterns suitable for white-label deployment.