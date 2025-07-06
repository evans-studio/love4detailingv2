# Love4Detailing Frontend Implementation Guide

## 🎯 Project Overview

Build a premium mobile car detailing booking system with a single service offering (Full Valet) across 4 vehicle size tiers. The system must be architected for future service expansion while maintaining the established dark theme UI and existing backend infrastructure. (See app-audit-2025.md to see current state of backend).

## 🏗️ Implementation Requirements

### Core Business Model
- **Single Service**: Full Valet & Detail (45 - 60 mins. needs to able to change if changes in the future)
- **4 Size Tiers**: Small (£55), Medium (£60), Large (£65), X-Large (£70)
- **Future-Ready**: Architecture must support easy addition of service types
- **Location**: SW9, London - Mobile Service - 10 Mile radius
- **Payment**: Cash only (Stripe integration prepared but disabled)

### Technical Constraints
- **Preserve**: All existing backend logic, API routes, and Supabase structures
- **Theme**: Dark UI with #141414 background and #9146FF accent
- **Components**: Use ShadCN/UI and existing design patterns
- **Icons**: Lucide icons only
- **Mobile-First**: Responsive design required

## 📝 Implementation Prompt

```

```

## 🛠️ Service Configuration Structure

```typescript
// lib/config/services.ts
export interface Service {
  id: string
  name: string
  description: string
  duration: string
  basePrice: number
  features: string[]
  available: boolean
  category?: string // For future categorization
  addOns?: ServiceAddOn[] // For future add-ons
}

export interface ServiceAddOn {
  id: string
  name: string
  price: number
  duration?: string
}

export const SERVICES: Service[] = [
  {
    id: 'full-valet',
    name: 'Full Valet & Detail',
    description: 'Complete interior and exterior detailing service',
    duration: '2-3 hours',
    basePrice: 55,
    available: true,
    features: [
      'Full exterior wash & dry',
      'Interior vacuum & wipe down', 
      'Window cleaning inside & out',
      'Tyre shine & wheel clean',
      'Dashboard UV protection',
      'Air freshener'
    ]
  }
  // Future services can be added here
]

export const SIZE_MULTIPLIERS = {
  small: 1.0,
  medium: 1.09,
  large: 1.18,
  xlarge: 1.27
}

export function calculateServicePrice(serviceId: string, vehicleSize: string): number {
  const service = SERVICES.find(s => s.id === serviceId)
  if (!service) return 0
  
  const multiplier = SIZE_MULTIPLIERS[vehicleSize.toLowerCase()] || 1
  return Math.round(service.basePrice * multiplier)
}
```

## 📐 Database Considerations

While not modifying the database, prepare for future service expansion:

```sql
-- Future migration (not implemented now)
-- ALTER TABLE bookings ADD COLUMN service_id TEXT DEFAULT 'full-valet';
-- ALTER TABLE bookings ADD COLUMN service_addons JSONB;

-- For now, use existing structure and store service info in booking metadata
```

## 🎨 UI Component Examples

### Service Card Component
```tsx
// components/services/ServiceCard.tsx
export function ServiceCard({ service, vehicleSize, selected, onSelect }) {
  const price = calculateServicePrice(service.id, vehicleSize)
  
  return (
    <Card 
      className={cn(
        "bg-[#1E1E1E] border-gray-800 p-6 cursor-pointer transition-all",
        selected && "border-[#9146FF] bg-[#9146FF]/5",
        "hover:border-[#9146FF]/30"
      )}
      onClick={() => onSelect(service.id)}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-[#F2F2F2]">{service.name}</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#9146FF]">£{price}</div>
          <div className="text-sm text-[#C7C7C7]">{service.duration}</div>
        </div>
      </div>
      
      <p className="text-[#C7C7C7] mb-4">{service.description}</p>
      
      <div className="space-y-2">
        {service.features.map((feature) => (
          <div key={feature} className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#28C76F]" />
            <span className="text-sm text-[#C7C7C7]">{feature}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
```

## 🔄 Migration Path for Future Services

1. **Phase 1** (Current): Single service, hardcoded in frontend
2. **Phase 2**: Multiple services, stored in config file
3. **Phase 3**: Dynamic services from database
4. **Phase 4**: Service packages and add-ons
5. **Phase 5**: Custom quotes and enterprise features

## ✅ Success Criteria

- Homepage converts visitors with clear service offering
- Booking flow seamlessly includes service selection (even with one option)
- Admin can view service-related analytics
- Code structure supports easy service additions
- UI maintains premium dark theme aesthetic
- Mobile experience is flawless
- All existing backend endpoints work without modification

## 🚀 Future Enhancements Ready

The implementation should prepare for:
- Interior-only service options
- Paint protection packages  
- Ceramic coating services
- Monthly maintenance plans
- Fleet/corporate packages
- Seasonal offerings (winter protection, summer shine)
- Express services (1-hour options)
- Premium add-ons (engine bay, leather treatment)

Build today for one service, but architect for many. The client should be able to add a new service by simply updating the configuration file and seeing it appear throughout the application.
