# Complete Dark Theme Implementation Prompt - #141414 Background

```
You need to implement the dark theme consistently across the ENTIRE Love4Detailing application using #141414 as the primary background color. Currently, only some pages have the dark theme applied. Every single page, component, and layout must use this consistent dark color palette.

CRITICAL REQUIREMENT: Apply #141414 background to EVERY page and component in the application.

DARK THEME PALETTE:
- Background Primary: #141414 (main app background)
- Background Secondary: #1E1E1E (cards, elevated surfaces)
- Background Elevated: #262626 (modals, dropdowns)
- Background Input: #1A1A1A (form inputs)
- Text Primary: #F2F2F2
- Text Secondary: #C7C7C7
- Text Muted: #8B8B8B
- Accent Primary: #9146FF (purple)
- Accent Hover: #7B2FFF
- Border: rgba(255, 255, 255, 0.08) or border-gray-800
- Success: #28C76F
- Error: #BA0C2F

IMPLEMENTATION CHECKLIST:

1. ROOT LAYOUT:
   - /app/layout.tsx - Add to <body>: className="bg-[#141414] text-[#F2F2F2] min-h-screen"
   - Ensure html element also has dark theme: <html className="dark bg-[#141414]">

2. LAYOUT COMPONENTS:
   - /components/layout/Header.tsx:
     * Background: bg-[#141414] with optional border-b border-gray-800
     * Logo/text: text-[#F2F2F2]
     * Navigation links: text-[#C7C7C7] hover:text-[#F2F2F2]
     * Mobile menu: bg-[#1E1E1E]
   
   - /components/layout/Footer.tsx:
     * Background: bg-[#141414] with border-t border-gray-800
     * All text: text-[#C7C7C7]
     * Links: text-[#F2F2F2] hover:text-[#9146FF]

   - /components/layout/DashboardSidebar.tsx:
     * Background: bg-[#1E1E1E]
     * Active item: bg-[#262626] text-[#9146FF]
     * Inactive items: text-[#C7C7C7] hover:text-[#F2F2F2]

3. PUBLIC PAGES (all should have bg-[#141414] wrapper):
   - /page.tsx (homepage) - Ensure main wrapper has bg-[#141414]
   - /book/page.tsx - Booking flow container bg-[#141414]
   - /book/[step]/page.tsx - Each step wrapped in bg-[#141414]
   - /confirmation/page.tsx - Dark confirmation page
   - Any other public pages

4. AUTH PAGES (critical - these are often missed):
   - /auth/sign-in/page.tsx:
     * Page wrapper: bg-[#141414] min-h-screen
     * Card: bg-[#1E1E1E] border-gray-800
     * Inputs: bg-[#1A1A1A] border-gray-700 text-[#F2F2F2]
   
   - /auth/sign-up/page.tsx - Same as sign-in
   - /auth/reset-password/page.tsx - Same dark treatment
   - /auth/admin-login/page.tsx - Consistent dark styling
   - /auth/confirm/page.tsx - Dark theme
   - /auth/callback/page.tsx - Dark loading state

5. CUSTOMER DASHBOARD:
   - /dashboard/layout.tsx - Wrapper bg-[#141414]
   - /dashboard/page.tsx - Main content area bg-[#141414]
   - /dashboard/bookings/page.tsx:
     * Page bg-[#141414]
     * Cards: bg-[#1E1E1E] border-gray-800
     * Table rows: hover:bg-[#262626]
   
   - /dashboard/profile/page.tsx - Dark forms
   - /dashboard/rewards/page.tsx - Dark reward cards
   - /dashboard/vehicles/page.tsx - Dark vehicle management

6. ADMIN PORTAL:
   - /admin/layout.tsx - Ensure bg-[#141414]
   - /admin/page.tsx - Dashboard with dark stats cards
   - /admin/bookings/page.tsx:
     * Data table: bg-[#1E1E1E]
     * Table header: bg-[#262626]
     * Rows: hover:bg-[#262626]
   
   - /admin/customers/page.tsx - Dark customer cards
   - /admin/analytics/page.tsx - Dark chart containers
   - /admin/availability/page.tsx - Dark calendar cells
   - /admin/settings/page.tsx - Dark setting sections
   - /admin/services/page.tsx - Dark service cards

7. UI COMPONENTS TO UPDATE:
   - /components/ui/button.tsx:
     * Default variant: bg-[#262626] hover:bg-[#363636]
     * Ghost variant: hover:bg-[#262626]
   
   - /components/ui/input.tsx:
     * Default: bg-[#1A1A1A] border-gray-700 text-[#F2F2F2] placeholder:text-[#8B8B8B]
   
   - /components/ui/card.tsx:
     * Default: bg-[#1E1E1E] border-gray-800
   
   - /components/ui/select.tsx:
     * Trigger: bg-[#1A1A1A] border-gray-700
     * Content: bg-[#262626] border-gray-700
   
   - /components/ui/dialog.tsx:
     * Overlay: bg-black/80
     * Content: bg-[#1E1E1E] border-gray-800
   
   - /components/ui/table.tsx:
     * Header: bg-[#262626]
     * Rows: hover:bg-[#262626]

8. FORM COMPONENTS:
   - All form wrappers should have consistent dark backgrounds
   - Error messages: text-[#BA0C2F]
   - Success messages: text-[#28C76F]
   - Form labels: text-[#C7C7C7]

SEARCH AND REPLACE PATTERNS:
```bash
# Find and replace these patterns:
bg-white → bg-[#1E1E1E]
bg-gray-50 → bg-[#262626]
bg-gray-100 → bg-[#1E1E1E]
bg-background → bg-[#141414]
text-black → text-[#F2F2F2]
text-gray-900 → text-[#F2F2F2]
text-gray-600 → text-[#C7C7C7]
text-gray-500 → text-[#8B8B8B]
border-gray-200 → border-gray-800
border-gray-300 → border-gray-700
hover:bg-gray-100 → hover:bg-[#262626]
hover:bg-gray-50 → hover:bg-[#1E1E1E]
```

CRITICAL AREAS TO CHECK:
1. Loading states - should have dark skeletons
2. Empty states - dark backgrounds with muted text
3. Error pages (404, 500) - must be dark themed
4. Toast notifications - dark with proper contrast
5. Dropdown menus - dark backgrounds
6. Modal dialogs - dark overlays and content
7. Mobile navigation - dark mobile menu
8. Print styles - exclude from dark theme

VALIDATION CHECKLIST:
- [ ] No white backgrounds anywhere (except logos/images)
- [ ] All pages have #141414 as base background
- [ ] All cards use #1E1E1E background
- [ ] All inputs use #1A1A1A background
- [ ] Header and Footer are fully dark themed
- [ ] Auth pages have dark backgrounds
- [ ] Admin portal is completely dark
- [ ] Customer dashboard is fully dark
- [ ] Mobile menu is dark themed
- [ ] All modals and dialogs are dark

The final result should be a cohesive dark-themed application where #141414 is the consistent background across every single page, creating a premium, professional appearance that matches the Love4Detailing brand.
```