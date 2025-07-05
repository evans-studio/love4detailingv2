# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Love4Detailing is a premium mobile car detailing booking system built with Next.js 14 (App Router), TypeScript, and Supabase. It's designed as a **white-label, licensed system** for service businesses that must be **clean, repeatable, and scalable**.

## System Mindset (Critical)

**Reference**: `/temp_docs/mindset.md` and `/temp_docs/app-guide.md`

### Primary Directives
1. **System Over Screens**: Every feature must be modular and configurable, not one-off UI
2. **One Source of Truth**: All editable content (text, services, prices) must live in config files - never hardcoded
3. **Role-Aware Architecture**: Three distinct user roles (Public, Authenticated User, Admin) with separate flows
4. **Clarity Over Speed**: Never guess or patch - ask, clarify, verify before implementing
5. **AI Agent Discipline**: Always re-read guidance before major features, fix systems not symptoms

### Hard Rules (DO NOT VIOLATE)
- ❌ Do not hardcode any service, copy, or price into components
- ❌ Do not build pages in isolation — build systems
- ❌ Do not bypass validation, even for testing
- ❌ Do not write duplicate logic across dashboard/public/admin areas
- ❌ Do not ignore route protection or auth gating
- ❌ Do not install libraries without explicit permission
- ❌ Do not handle sensitive data without secure .env use

✅ **Always centralize, always validate, always assume scale.**

## Common Development Commands

```bash
# Development
npm run dev                # Start dev server with session reset
npm run reset-session     # Reset user session
npm run build             # Production build
npm run start             # Production server

# Database
npm run reset-db          # Reset database
npm run setup-database    # Full database setup with seed data

# Testing
npm run test              # Run Jest tests
npm run test:email        # Test email functionality
```

## High-Level Architecture

### Core Structure
- **Next.js App Router**: Routes in `/src/app/` with public routes, dashboard, admin, and API
- **Layered Architecture**: API layer (`/lib/api/`), Service layer (`/lib/services/`), Components (`/components/`), Pages (`/app/`)
- **Supabase Backend**: PostgreSQL with Row Level Security, auth, and real-time features

### Key Features
1. **Smart Vehicle Management**: Local JSON-based vehicle size logic, dynamic pricing, and multi-vehicle profiles
2. **Flexible Booking System**: Multi-step flow, time slot management, anonymous booking support
3. **Rewards/Loyalty System**: Three-tier program with points and benefits
4. **Admin Dashboard**: Comprehensive booking and user management

### Database Design
- **Core Tables**: users, vehicles, vehicle_sizes, bookings, time_slots, rewards, reward_transactions
- **RLS Implemented**: All tables have Row Level Security for data isolation
- **Anonymous Support**: Non-registered users can make bookings
- **Vehicle Intelligence**: Automatic size categorization with unknown vehicle tracking

## Development Patterns

### Component Architecture
- **UI Components**: ShadCN/UI + Radix primitives in `/src/components/ui/`
- **Feature Components**: Organized by feature (booking, dashboard, auth)
- **Form Validation**: React Hook Form + Zod schemas in `/src/lib/validation/`

### API Design
- **RESTful Structure**: API routes in `/src/app/api/`
- **Service Layer**: Business logic in `/src/lib/services/`
- **Type Safety**: Comprehensive TypeScript definitions in `/src/types/`

### Authentication Flow
- **Middleware Protection**: Route protection in `middleware.ts`
- **Supabase Auth**: Integration with role-based access control
- **Session Management**: User contexts and session handling

## Database Considerations

### Key Constraints
- **Booking Conflicts**: Time slots have booking flags to prevent double-booking
- **Vehicle Sizes**: Must exist in `vehicle_sizes` table for pricing
- **Rewards**: Tier progression based on points thresholds
- **RLS Policies**: All data access is user-scoped through policies

### Migration Strategy
- **Sequential Migrations**: 21+ migration files in `/supabase/migrations/`
- **Database Reset**: Use `npm run reset-db` for clean state
- **Seed Data**: Automated setup with vehicle sizes and time slots

## Configuration

### Environment Variables
```bash
# Supabase (Production Instance)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
RESEND_API_KEY=

# Feature Flags
NEXT_PUBLIC_ENABLE_STRIPE=false
```

### Feature Flags
- **Stripe Payments**: Disabled by default (cash payments)
- **Email Notifications**: Configurable via environment
- **DVLA Integration**: UK vehicle lookup service

## Theme and Styling

### Brand Colors
- **Primary**: Purple (#9747FF)
- **Design System**: TailwindCSS with custom configuration
- **Component Library**: ShadCN/UI components

### Animation
- **GSAP**: Used for complex animations
- **Framer Motion**: For UI transitions

## Testing and Scripts

### Test Files
- **Core Tests**: `/scripts/test-*.ts` files for different components
- **Email Testing**: Dedicated email testing script
- **Database Testing**: Connection and data integrity tests

### Development Scripts
- **Session Reset**: Clears user sessions for testing
- **Database Setup**: Full database initialization with seed data
- **Stability Tests**: Various system component tests

## Common Patterns

### Form Handling
- **React Hook Form**: For form state management
- **Zod Validation**: Schema validation for all inputs
- **Error Handling**: Comprehensive error states and messages

### Data Fetching
- **Server Components**: Default for data fetching
- **Client Components**: Only when interactivity needed
- **API Routes**: For complex business logic and mutations

### State Management
- **React Context**: For global state (Auth, Booking)
- **Local State**: React hooks for component state
- **Server State**: Next.js server components and actions

## Important Notes

### Next.js Specific
- **App Router**: Use server components by default
- **Client Components**: Only add "use client" when necessary
- **Metadata**: Server components only - remove from client components

### Supabase Integration
- **RLS Required**: All new tables must have Row Level Security
- **Anonymous Access**: Consider anonymous user flows
- **Real-time**: Supabase real-time features available

### Performance
- **Image Optimization**: Use Next.js Image component
- **Bundle Optimization**: Import only what's needed
- **Database Optimization**: Efficient queries with proper indexing

## Deprecated or Planned Flags
These are available but not currently in use:
- **NEXT_PUBLIC_ENABLE_STRIPE**: false (cash only)
- **DVLA Integration**: deprecated in favor of local size matching

## Troubleshooting & Common Issues

- **Supabase Schema Cache**: Run `npx supabase db reset` to refresh schema when new columns cause 42703 errors
- **RLS Errors**: Confirm active session and proper role match before querying
- **Component Not Rendering**: Confirm route exists and layout includes `AuthProvider`

