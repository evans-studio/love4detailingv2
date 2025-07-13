# Love4Detailing Brand Theme Guide

## Overview
This guide ensures all new components follow the Love4Detailing brand identity, featuring a premium glass-morphism design with signature purple accents and professional aesthetics suitable for a mobile car detailing service.

## Core Brand Colors

### Primary Purple
- **Main Brand Color**: `#9747FF`
- **Usage**: Primary buttons, accents, highlights, CTAs
- **CSS Variable**: `var(--primary)`

### Glass-Morphism System
```css
/* Background layers */
--background: transparent
--card: rgba(255, 255, 255, 0.1)
--border: rgba(255, 255, 255, 0.2)

/* Text hierarchy */
--foreground: rgba(255, 255, 255, 1)
--muted: rgba(255, 255, 255, 0.6)
--muted-foreground: rgba(255, 255, 255, 0.7)
```

### State Colors
- **Success**: `#28C76F` (green for completed actions)
- **Warning**: `#FFA726` (orange for alerts/extended areas)
- **Error**: `#BA0C2F` (red for errors/destructive actions)
- **Info**: `#29B6F6` (blue for informational content)

## Typography Standards

### Headings
```jsx
// Large page titles
className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent"

// Section titles
className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent"

// Card titles
className="text-white font-semibold"
```

### Body Text
```jsx
// Primary text
className="text-white"

// Secondary text
className="text-white/80"

// Muted text
className="text-white/60"

// Accent text
className="text-purple-300"
```

## Component Patterns

### Card Components
```jsx
// Standard card
<Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-white">
      <IconComponent className="h-5 w-5 text-purple-400" />
      Card Title
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// Enhanced glass card
<Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">

// Premium card with glow
<Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl shadow-purple-500/25">
```

### Button Components
```jsx
// Primary button
<Button className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-200">

// Secondary button
<Button variant="outline" className="border-purple-500/50 text-purple-200 hover:bg-purple-600/10 hover:border-purple-400/60 transition-all duration-200">

// Subtle button
<Button variant="outline" className="border-white/20 text-white/70 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all duration-200">
```

### Modal Components
```jsx
// Modal overlay
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">

// Modal container
<div className="bg-gray-800/90 backdrop-blur-xl border border-white/20 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl shadow-purple-500/25">
```

### Form Components
```jsx
// Input fields
<Input className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400" />

// Labels
<Label className="text-gray-300">

// Form sections
<div className="space-y-4">
```

### Status Indicators
```jsx
// Status badges
<Badge className="bg-green-500/20 text-green-300 border-green-400/30">Completed</Badge>
<Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30">Pending</Badge>
<Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">In Progress</Badge>
<Badge className="bg-red-500/20 text-red-300 border-red-400/30">Cancelled</Badge>

// Status cards with color coding
<Card className="bg-success/10 border border-success/20">
<Card className="bg-warning/10 border border-warning/20">
<Card className="bg-destructive/10 border border-destructive/20">
```

## Animation Standards

### Transitions
```css
/* Standard transition */
transition-all duration-200

/* Enhanced transition */
transition-all duration-300 ease-in-out

/* Premium transition */
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

### Hover Effects
```jsx
// Scale effect
className="hover:scale-105 transition-transform duration-200"

// Glow effect
className="hover:shadow-lg hover:shadow-purple-500/25 transition-shadow duration-200"

// Background change
className="hover:bg-white/10 transition-colors duration-200"
```

### Loading States
```jsx
// Loading spinner
<Loader2 className="h-8 w-8 animate-spin text-purple-400" />

// Loading skeleton
<div className="animate-pulse bg-white/20 rounded" />
```

## Icon Usage

### Icon Colors
```jsx
// Primary icons (section headers)
<IconComponent className="h-5 w-5 text-purple-400" />

// Secondary icons
<IconComponent className="h-4 w-4 text-white/60" />

// Interactive icons
<IconComponent className="h-4 w-4 text-purple-200" />
```

## Layout Standards

### Spacing
```jsx
// Section spacing
className="space-y-6"

// Content spacing
className="space-y-4"

// Element spacing
className="gap-2" // or gap-4 for larger spacing
```

### Grid Systems
```jsx
// Responsive grid
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Card grid
className="grid grid-cols-1 md:grid-cols-2 gap-6"
```

### Container Patterns
```jsx
// Standard container
className="max-w-4xl mx-auto px-4"

// Full-width sections
className="w-full"

// Centered content
className="flex items-center justify-center"
```

## Responsive Design

### Breakpoints
- **xs**: 475px
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Mobile-First Patterns
```jsx
// Responsive text
className="text-sm md:text-base"

// Responsive spacing
className="p-4 md:p-6"

// Responsive layout
className="flex flex-col lg:flex-row"

// Touch-friendly targets
className="min-h-[44px]" // Minimum touch target
```

## Performance Optimizations

### Hardware Acceleration
```css
/* Add to animated elements */
transform: translateZ(0);
will-change: transform;
```

### Backdrop Blur Levels
```jsx
// Light blur
className="backdrop-blur-sm" // 4px

// Medium blur
className="backdrop-blur-md" // 8px

// Heavy blur
className="backdrop-blur-xl" // 16px
```

## Accessibility

### Focus States
```jsx
// Focus rings
className="focus-visible:ring-2 ring-purple-400/50 focus-visible:outline-none"

// High contrast
className="text-white" // Ensure sufficient contrast
```

### Touch Targets
```jsx
// Minimum touch target size
className="min-h-[44px] min-w-[44px]"
```

## Brand-Specific Elements

### Ambient Backgrounds
```jsx
// Radial gradients for depth
className="bg-[radial-gradient(circle_at_50%_50%,rgba(151,71,255,0.1),transparent_70%)]"

// Layered gradients
className="bg-gradient-to-br from-purple-900/20 via-transparent to-purple-800/10"
```

### Premium Effects
```jsx
// Glow effects
className="shadow-2xl shadow-purple-500/25"

// Glass shimmer
className="relative before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent"
```

## Error States

### Error Messages
```jsx
<div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 backdrop-blur-sm">
  <div className="flex items-center gap-2">
    <AlertCircle className="h-4 w-4 text-red-400" />
    <p className="text-red-300">{error}</p>
  </div>
</div>
```

### Success Messages
```jsx
<div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 backdrop-blur-sm">
  <div className="flex items-center gap-2">
    <CheckCircle className="h-4 w-4 text-green-400" />
    <p className="text-green-300">{message}</p>
  </div>
</div>
```

## Implementation Checklist

When creating new components, ensure:

- [ ] Glass-morphism background with appropriate blur level
- [ ] Purple (#9747FF) accent color for primary elements
- [ ] White text with opacity variations for hierarchy
- [ ] Smooth transitions (200-300ms duration)
- [ ] Hover states with scale/glow effects
- [ ] Proper focus states for accessibility
- [ ] Mobile-first responsive design
- [ ] Touch-friendly target sizes (min 44px)
- [ ] Consistent spacing using space-y-* classes
- [ ] Brand-appropriate icons with purple accent colors
- [ ] Performance optimizations (hardware acceleration)

## Example Complete Component

```jsx
const BrandCard = ({ title, children, icon: Icon }) => {
  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/20 transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl hover:shadow-purple-500/25">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Icon className="h-5 w-5 text-purple-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  )
}
```

This component follows all brand guidelines: glass-morphism background, purple accents, proper spacing, smooth transitions, and responsive design.