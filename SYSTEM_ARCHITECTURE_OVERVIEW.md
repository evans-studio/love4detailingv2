# Love4Detailing - Complete System Architecture Overview

*Comprehensive system documentation for development agents*  
*Target: New Development Agent Onboarding*  
*Last Updated: January 2025*

---

## 🎯 **PROJECT OVERVIEW**

Love4Detailing is a **premium mobile car detailing booking system** built as a **white-label, licensed platform** for service businesses. The system emphasizes **clean, repeatable, and scalable architecture** with a focus on **professional presentation** and **business-grade functionality**.

### **Core Business Model**
- **Premium mobile car detailing** services delivered to customer locations
- **Service area**: SW9 base with 10-mile standard radius, 25-mile extended coverage
- **Pricing model**: Distance-based with travel supplements for extended areas
- **Payment**: Cash on completion (Stripe disabled by default)

### **Target Users**
1. **Public Users**: Browse services, check availability, book anonymously
2. **Authenticated Customers**: Manage bookings, vehicles, rewards, dashboard access
3. **Admin Users**: Complete business management, schedule control, customer oversight

---

## 🏗️ **TECHNICAL ARCHITECTURE**

### **Core Technology Stack**
- **Frontend**: Next.js 14 (App Router), TypeScript, React 18
- **Backend**: Next.js API routes, Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: TailwindCSS with custom configuration, ShadCN/UI components
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with role-based access control
- **Email**: Resend API for transactional emails
- **Deployment**: Vercel (frontend), Supabase (backend services)

### **Project Structure**
```
love4detailing-v2/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (public)/          # Public routes (homepage, booking)
│   │   ├── admin/             # Admin dashboard and management
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Customer dashboard
│   │   └── api/               # API routes
│   ├── components/            # Reusable UI components
│   │   ├── ui/               # ShadCN/UI base components
│   │   ├── admin/            # Admin-specific components
│   │   ├── auth/             # Authentication components
│   │   ├── booking/          # Booking flow components
│   │   ├── dashboard/        # Dashboard components
│   │   └── layout/           # Layout components
│   ├── lib/                  # Core utilities and services
│   │   ├── api/             # API client functions
│   │   ├── auth/            # Authentication context/utilities
│   │   ├── config/          # Configuration files
│   │   ├── services/        # Business logic services
│   │   ├── supabase/        # Supabase client configuration
│   │   └── utils/           # Utility functions
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   └── data/                # Static data files
├── supabase/                # Database schema and migrations
│   ├── migrations/          # Database migration files
│   └── seed.sql            # Initial data seeding
├── scripts/                 # Development and utility scripts
├── temp_docs/              # Development documentation
└── public/                 # Static assets
```

---

## 🎨 **DESIGN SYSTEM & UI FRAMEWORK**

### **Brand Identity**
- **Primary Color**: Purple (#9747FF) - Premium brand accent
- **Design Language**: Dark theme with glass-morphism effects
- **Typography**: Professional hierarchy with responsive scaling
- **Visual Style**: Modern, premium, business-appropriate

### **Component Architecture**
- **Base Components**: ShadCN/UI with custom theming
- **Layout System**: Unified layout components for consistency
- **Responsive Design**: Mobile-first with desktop optimization
- **Animation**: Smooth transitions with GSAP and Framer Motion

### **Key UI Components**
- **UnifiedDashboardLayout**: Consistent layout across admin/customer areas
- **UnifiedSidebar**: Role-aware navigation adapting to user permissions
- **BookingFlow**: Multi-step booking process with validation
- **CalendarBooking**: Modern calendar interface for scheduling
- **PostcodeChecker**: Service area validation with real-time feedback

---

## 📊 **DATABASE ARCHITECTURE**

### **Core Database Schema**
```sql
-- User Management
users (id, email, role, created_at, updated_at)
profiles (id, user_id, full_name, phone, address, postcode)

-- Service Management
services (id, name, description, active, created_at)
service_pricing (id, service_id, vehicle_size, price_pence, duration_minutes)

-- Vehicle Management
vehicles (id, user_id, make, model, year, registration, size, size_confirmed)
vehicle_model_registry (id, make, model, size, year_start, year_end)

-- Booking System
bookings (id, user_id, service_id, vehicle_id, date, start_time, end_time, status, total_price_pence, address, postcode, notes)
available_slots (id, date, start_time, end_time, is_available, booking_id)

-- Rewards System
customer_rewards (id, user_id, points_balance, tier, total_earned, total_redeemed)
reward_transactions (id, user_id, points, transaction_type, description, booking_id)
```

### **Row Level Security (RLS)**
- **Complete data isolation** between users
- **Role-based access control** for admin/customer/staff permissions
- **Anonymous booking support** for non-registered users
- **Secure data access** with policy-based filtering

### **Data Relationships**
- **Users**: One-to-one with profiles, one-to-many with vehicles/bookings
- **Services**: One-to-many with pricing tiers and bookings
- **Vehicles**: Linked to users and bookings, with registry for size detection
- **Bookings**: Central entity connecting users, services, vehicles, and slots

---

## 🔐 **AUTHENTICATION & AUTHORIZATION**

### **Authentication Flow**
- **Supabase Auth**: Email-based authentication with magic links
- **Role Management**: admin, customer, staff, super_admin roles
- **Session Handling**: Persistent sessions with automatic refresh
- **Password Reset**: Secure password reset flow with email verification

### **Authorization Levels**
1. **Public Access**: Homepage, service information, anonymous booking
2. **Authenticated Users**: Dashboard, vehicle management, booking history
3. **Staff Users**: Limited admin functions, customer support
4. **Admin Users**: Full system access, business management
5. **Super Admin**: System administration, user role management

### **Route Protection**
- **Middleware**: Route-level authentication checking
- **Component Guards**: Role-based component access control
- **API Security**: All API routes protected with authentication
- **Database Security**: RLS policies enforcing data access rules

---

## 📅 **BOOKING SYSTEM ARCHITECTURE**

### **Booking Flow Process**
1. **Service Selection**: Choose from available services
2. **Vehicle Details**: Enter vehicle information with size detection
3. **Date/Time Selection**: Calendar-based slot selection
4. **Personal Details**: Contact information with postcode validation
5. **Confirmation**: Review and confirm booking details
6. **Payment**: Cash on completion (Stripe integration available)

### **Schedule Management**
- **Admin Schedule Control**: Add/edit/delete available time slots
- **Real-time Sync**: Schedule changes instantly visible to customers
- **Conflict Prevention**: Automatic double-booking prevention
- **Calendar Integration**: Modern calendar interface for both admin and customers

### **Postcode Validation System**
- **Service Area Checking**: Real-time postcode validation
- **Distance Calculation**: Haversine formula for accurate distance measurement
- **Pricing Transparency**: Automatic travel charge calculation
- **Coverage Areas**: Standard (0-10 miles), Extended (10-25 miles), Special arrangements (25+ miles)

---

## 🎯 **BUSINESS LOGIC & SERVICES**

### **Service Management**
- **Dynamic Pricing**: Vehicle size-based pricing tiers
- **Service Configuration**: Configurable services with duration and pricing
- **Availability Management**: Real-time slot availability checking
- **Booking Validation**: Comprehensive booking validation rules

### **Vehicle Intelligence**
- **Size Detection**: Automatic vehicle size categorization
- **Registry System**: 66+ vehicle entries for accurate sizing
- **Manual Override**: Size confirmation system for accuracy
- **Multi-vehicle Support**: Customers can manage multiple vehicles

### **Rewards System**
- **Points Earning**: Points awarded for completed bookings
- **Tier Progression**: Bronze/Silver/Gold/Platinum tiers
- **Redemption System**: Points redeemable for service discounts
- **Transaction History**: Complete points transaction tracking

---

## 🚀 **DEPLOYMENT & ENVIRONMENT**

### **Environment Configuration**
```bash
# Supabase (Production Instance)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email Service
RESEND_API_KEY=your_resend_api_key

# Feature Flags
NEXT_PUBLIC_ENABLE_STRIPE=false
```

### **Development Commands**
```bash
# Development
npm run dev                # Start development server
npm run build             # Production build
npm run start             # Production server

# Database
npm run reset-db          # Reset database
npm run setup-database    # Full database setup with seed data

# Testing
npm run test              # Run tests
npm run test:email        # Test email functionality
```

### **Deployment Architecture**
- **Frontend**: Vercel deployment with automatic deployments
- **Backend**: Supabase managed PostgreSQL with edge functions
- **CDN**: Vercel Edge Network for global content delivery
- **Email**: Resend API for transactional email delivery

---

## 🔧 **DEVELOPMENT PATTERNS & CONVENTIONS**

### **Code Architecture Principles**
1. **System Over Screens**: Modular, configurable features over one-off UI
2. **One Source of Truth**: All content in config files, never hardcoded
3. **Role-Aware Design**: Three distinct user flows with appropriate access
4. **Clarity Over Speed**: Comprehensive validation and error handling
5. **Scalable Architecture**: Built for multi-tenant, white-label deployment

### **Component Patterns**
- **Server Components**: Default for data fetching and static content
- **Client Components**: Only when interactivity required
- **Compound Components**: Complex UI patterns with multiple sub-components
- **Hook-based Logic**: Custom hooks for reusable business logic

### **API Design Patterns**
- **RESTful Structure**: Consistent API route organization
- **Type-Safe APIs**: Full TypeScript integration
- **Error Handling**: Comprehensive error responses with proper HTTP codes
- **Validation**: Zod schemas for runtime type checking

---

## 📱 **RESPONSIVE DESIGN & MOBILE OPTIMIZATION**

### **Responsive Strategy**
- **Mobile-First**: Designed for mobile with progressive enhancement
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Touch Optimization**: Adequate touch targets and gesture support
- **Performance**: Optimized loading and interaction on mobile devices

### **Cross-Device Experience**
- **Mobile**: Single-column layout with touch-friendly interactions
- **Tablet**: Enhanced spacing with improved touch targets
- **Desktop**: Multi-column layout with mouse-optimized interactions
- **Large Desktop**: Contained layout with optimal information density

---

## 🛠️ **TESTING & QUALITY ASSURANCE**

### **Testing Strategy**
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API route and database integration testing
- **E2E Tests**: Complete user journey testing with Playwright
- **Manual Testing**: Cross-browser and device testing

### **Quality Standards**
- **TypeScript**: Full type safety with strict configuration
- **ESLint**: Code quality and consistency enforcement
- **Prettier**: Automated code formatting
- **Performance**: Core Web Vitals optimization

---

## 🔍 **MONITORING & ANALYTICS**

### **Performance Monitoring**
- **Core Web Vitals**: LCP, FID, CLS optimization
- **Real User Monitoring**: Actual user experience tracking
- **Error Tracking**: Comprehensive error logging and reporting
- **Database Performance**: Query optimization and monitoring

### **Business Analytics**
- **Booking Analytics**: Conversion tracking and funnel analysis
- **Customer Insights**: Usage patterns and retention metrics
- **Revenue Tracking**: Service performance and pricing optimization
- **Operational Metrics**: Admin efficiency and system usage

---

## 📋 **CURRENT SYSTEM STATUS**

### **✅ Production-Ready Features**
- **Homepage**: Premium dark theme with service showcase
- **Booking System**: Complete booking flow with validation
- **Admin Dashboard**: Full business management interface
- **Customer Dashboard**: Personal booking and vehicle management
- **Schedule Management**: Real-time calendar-based scheduling
- **Postcode Validation**: Service area checking with pricing
- **Rewards System**: Points-based loyalty program
- **Authentication**: Complete user management with roles

### **🎯 System Specifications**
- **Database**: Clean state with 0 bookings for fresh deployment
- **Users**: 4 configured users with proper role assignments
- **Services**: 1 active service (Full Valet) with 4 pricing tiers
- **Vehicle Registry**: 66 vehicle entries for size detection
- **Migrations**: 40+ database migrations for complete schema

### **🔧 Recent Improvements**
- **Layout Optimization**: Fixed admin slot layout for desktop consistency
- **Responsive Design**: Enhanced mobile-first approach with desktop optimization
- **Visual Polish**: Improved component styling and interaction feedback
- **Performance**: Optimized loading and rendering across all devices

---

## 🎯 **DEVELOPMENT GUIDELINES**

### **Hard Rules (Never Violate)**
- ❌ **No hardcoded content**: All text, services, prices in config files
- ❌ **No isolated pages**: Build systems, not one-off screens
- ❌ **No validation bypass**: Always validate inputs and business rules
- ❌ **No duplicate logic**: Centralize business logic in services
- ❌ **No unauthorized access**: Respect role-based access control
- ❌ **No unsafe data handling**: Always use secure environment variables

### **Best Practices**
- ✅ **Centralize configuration**: Use config files for all business data
- ✅ **Validate everything**: Runtime validation with comprehensive error handling
- ✅ **Follow role patterns**: Respect three-tier user access model
- ✅ **Mobile-first design**: Progressive enhancement for larger screens
- ✅ **Type safety**: Full TypeScript integration with strict typing
- ✅ **Performance optimization**: Efficient rendering and data fetching

---

## 🔮 **FUTURE ARCHITECTURE CONSIDERATIONS**

### **Scalability Preparation**
- **Multi-tenant Architecture**: White-label deployment capabilities
- **Microservices Migration**: Modular service extraction potential
- **API Gateway**: Centralized API management and rate limiting
- **Caching Strategy**: Redis integration for performance optimization

### **Feature Expansion**
- **Payment Integration**: Stripe payment processing (configurable)
- **Advanced Analytics**: Business intelligence and reporting
- **Mobile App**: React Native mobile application
- **API Ecosystem**: Third-party integrations and webhooks

---

## 📚 **CRITICAL FILES & LOCATIONS**

### **Configuration Files**
- `CLAUDE.md`: Complete development guidance and system rules
- `src/lib/config/services.ts`: Service configuration and pricing
- `src/types/database.types.ts`: Complete database type definitions
- `tailwind.config.ts`: Design system configuration

### **Core Components**
- `src/components/layout/UnifiedDashboardLayout.tsx`: Main layout system
- `src/components/booking/BookingFlow.tsx`: Complete booking process
- `src/app/admin/schedule/page.tsx`: Admin schedule management
- `src/app/page.tsx`: Homepage with service showcase

### **API Routes**
- `src/app/api/bookings/`: Booking management APIs
- `src/app/api/admin/`: Admin-specific APIs
- `src/app/api/auth/`: Authentication APIs
- `src/app/api/vehicles/`: Vehicle management APIs

### **Database Schema**
- `supabase/migrations/`: Complete migration history
- `supabase/seed.sql`: Initial data seeding
- Database policies: Row Level Security implementations

---

This comprehensive overview provides the foundation for understanding and working with the Love4Detailing system. The architecture emphasizes **scalability, maintainability, and professional presentation** while maintaining **business-grade functionality** across all user types and use cases.

*For specific implementation details, refer to the individual component documentation and the CLAUDE.md file for complete development guidance.*