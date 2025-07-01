# Love4Detailing - Premium Car Detailing Booking System

A modern, white-label booking system for premium car detailing services. Built with Next.js 14, Supabase, and TailwindCSS.

## Features

### 🚗 Smart Vehicle Management
- DVLA integration for automatic vehicle lookup
- Intelligent vehicle size categorization
- Automatic price adjustment based on vehicle size
- Unknown vehicle logging for business intelligence

### 💳 Flexible Payments
- Cash payments by default
- Stripe integration ready (feature-flagged)
- Secure payment processing
- Comprehensive transaction history

### 🎁 Loyalty Rewards System
- Points-based rewards
- Three-tier system (Bronze, Silver, Gold)
- Automatic tier progression
- Transaction history and points tracking
- Special benefits per tier

### 👤 User Management
- Secure authentication with Supabase
- Profile management
- Booking history
- Vehicle management
- Points and rewards tracking

### 📅 Smart Booking
- Dynamic time slot management
- Vehicle-size based pricing
- Automatic confirmations
- Email notifications
- Admin dashboard for booking management

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **UI Components**: ShadCN/UI + Radix
- **Backend**: Supabase (PostgreSQL + Auth) - Production hosted instance
- **Forms**: React Hook Form + Zod
- **Styling**: TailwindCSS + GSAP for animations
- **Email**: Resend for transactional emails

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase credentials from the production instance.

4. Run the connection test:
   ```bash
   npm run test-connection
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

> **Note**: This project uses a production Supabase instance. There is no local database setup required.

## Environment Variables

Required environment variables:

```bash
# Supabase (Production Instance)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# Feature Flags
NEXT_PUBLIC_ENABLE_STRIPE=false
```

## Database Schema

The system uses the following main tables:

- `users`: User profiles and authentication
- `vehicles`: Vehicle information and size categorization
- `bookings`: Booking records and status
- `rewards`: User points and tier information
- `reward_transactions`: Points history
- `missing_vehicle_models`: Unknown vehicle logging

## Deployment

The system is designed to be deployed on Vercel:

1. Fork the repository
2. Connect to Vercel
3. Set up environment variables
4. Deploy

## Customization

### Branding
- Update `src/lib/theme/tokens.ts` for colors and typography
- Modify `tailwind.config.ts` for custom design tokens
- Update content in `src/data/content.ts`

### Services
- Modify `src/data/services.ts` for service offerings
- Update pricing in `src/lib/constants/payment.ts`
- Adjust time slots in `src/lib/api/time-slots.ts`

### Rewards System
- Configure tiers in `src/lib/services/rewards.ts`
- Adjust points values for actions
- Customize tier benefits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This is a proprietary system. All rights reserved.

## Support

For support, please contact support@love4detailing.com
