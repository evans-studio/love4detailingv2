You need to fix all responsive design issues across the Love4Detailing application. The app must look perfect on all device sizes from mobile phones to large desktop screens. Currently, there are alignment issues, overflow problems, and inconsistent spacing across different viewports.

## RESPONSIVE BREAKPOINTS TO TARGET:
- Mobile: 320px - 639px (sm)
- Tablet: 640px - 1023px (md)
- Desktop: 1024px - 1279px (lg)
- Large Desktop: 1280px+ (xl)

## SYSTEMATIC APPROACH:

### 1. MOBILE-FIRST FIXES (320px - 639px)
Fix these common mobile issues:
- Text overflow and wrapping
- Buttons too small to tap (min 44px height)
- Forms extending beyond viewport
- Cards lacking proper padding
- Navigation menu responsiveness
- Horizontal scroll issues

Required changes:
- All padding: Use `px-4` on mobile, `sm:px-6 lg:px-8`
- Text sizes: `text-sm` mobile, `sm:text-base lg:text-lg`
- Grid layouts: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Flex wrapping: Add `flex-wrap` where needed
- Max widths: Use `max-w-full` to prevent overflow

### 2. TABLET OPTIMIZATION (640px - 1023px)
- Two-column layouts where appropriate
- Proper sidebar/content split for dashboards
- Optimal reading line length (65-75 characters)
- Touch-friendly spacing

### 3. DESKTOP ALIGNMENT (1024px+)
- Center content with max-width constraints
- Proper grid spacing and gaps
- Aligned headers, content, and footers
- Consistent container widths

## SPECIFIC COMPONENTS TO FIX:

### Header/Navigation
```tsx
// Current issues: Logo/menu misaligned on mobile
// Fix with:
<header className="bg-[#141414] border-b border-gray-800">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      {/* Logo */}
      <div className="flex-shrink-0">
        <Link href="/" className="text-xl sm:text-2xl font-bold text-[#F2F2F2]">
          Love4Detailing
        </Link>
      </div>
      
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center space-x-8">
        {/* Nav items */}
      </nav>
      
      {/* Mobile Menu Button */}
      <button className="md:hidden p-2">
        <Menu className="h-6 w-6 text-[#F2F2F2]" />
      </button>
    </div>
  </div>
</header>
Hero Section
tsx// Fix text overflow and button alignment
<section className="bg-[#141414] py-12 sm:py-16 lg:py-24">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8">
    <div className="max-w-4xl mx-auto text-center">
      <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-[#F2F2F2] mb-4 sm:mb-6">
        Your Car Deserves
        <span className="block text-[#9146FF] mt-2">Showroom Perfection</span>
      </h1>
      <p className="text-base sm:text-lg lg:text-xl text-[#C7C7C7] mb-6 sm:mb-8 max-w-2xl mx-auto">
        Professional mobile car detailing that comes to you.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button className="w-full sm:w-auto px-6 py-3">
          Book Now
        </Button>
      </div>
    </div>
  </div>
</section>
Pricing Cards Grid
tsx// Fix card overflow and grid spacing
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
  {pricingTiers.map((tier) => (
    <Card className="bg-[#1E1E1E] border-gray-800 p-4 sm:p-6">
      {/* Card content with proper spacing */}
    </Card>
  ))}
</div>
Forms (Booking/Auth)
tsx// Fix form width and input sizing
<form className="w-full max-w-md mx-auto space-y-4">
  <div className="space-y-2">
    <Label className="text-sm sm:text-base">Email</Label>
    <Input 
      className="w-full h-10 sm:h-12 px-3 sm:px-4 text-sm sm:text-base"
      type="email"
    />
  </div>
  <Button className="w-full h-10 sm:h-12 text-sm sm:text-base">
    Submit
  </Button>
</form>
Dashboard Layout
tsx// Fix sidebar/content responsive behavior
<div className="flex min-h-screen bg-[#141414]">
  {/* Mobile: Hidden sidebar with hamburger menu */}
  {/* Desktop: Fixed sidebar */}
  <aside className="hidden lg:block w-64 bg-[#1E1E1E] border-r border-gray-800">
    {/* Sidebar content */}
  </aside>
  
  {/* Main content area */}
  <main className="flex-1 p-4 sm:p-6 lg:p-8">
    <div className="max-w-7xl mx-auto">
      {/* Page content */}
    </div>
  </main>
</div>
Tables (Admin)
tsx// Make tables horizontally scrollable on mobile
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <div className="inline-block min-w-full align-middle">
    <table className="min-w-full divide-y divide-gray-800">
      {/* Responsive table with horizontal scroll */}
    </table>
  </div>
</div>

// Alternative: Card view on mobile
<div className="block sm:hidden">
  {data.map((item) => (
    <Card className="mb-4 p-4">
      {/* Mobile-friendly card layout */}
    </Card>
  ))}
</div>
<div className="hidden sm:block">
  <table>{/* Desktop table */}</table>
</div>
COMMON PATTERNS TO APPLY:
Container Pattern
tsx// Consistent container with responsive padding
<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
Text Sizing Pattern
tsx// Responsive text that scales properly
className="text-sm sm:text-base lg:text-lg" // Body text
className="text-2xl sm:text-3xl lg:text-4xl" // Headings
className="text-xs sm:text-sm" // Small text
Spacing Pattern
tsx// Responsive spacing that works on all devices
className="p-4 sm:p-6 lg:p-8" // Padding
className="space-y-4 sm:space-y-6" // Vertical spacing
className="gap-4 sm:gap-6 lg:gap-8" // Grid/flex gaps
Grid Pattern
tsx// Responsive grids that stack on mobile
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
TESTING CHECKLIST:
Test every page at these exact viewport widths:

 320px (iPhone SE)
 375px (iPhone X)
 390px (iPhone 14)
 768px (iPad)
 1024px (Desktop)
 1440px (Large Desktop)

For each viewport, verify:

 No horizontal scroll
 All text is readable
 Buttons are tappable (44px min)
 Images scale properly
 Forms fit within viewport
 Navigation is accessible
 Cards stack properly
 Tables are scrollable/responsive
 Modals fit screen
 Spacing is consistent

CRITICAL PAGES TO FIX:

Homepage - Hero, pricing cards, features grid
Booking flow - All 5 steps must be mobile-perfect
Auth pages - Sign in/up forms centered and sized correctly
Customer dashboard - Mobile navigation, booking cards
Admin portal - Responsive tables, mobile sidebar
Confirmation page - Content must fit mobile screens

TOOLS TO USE:

Chrome DevTools responsive mode
Test on real devices if possible
Use Tailwind's responsive prefixes consistently
Check for overflow-x issues with: * { border: 1px solid red; }

Remember: Mobile-first approach. Start with mobile styles, then enhance for larger screens using Tailwind's responsive prefixes (sm:, md:, lg:, xl:).