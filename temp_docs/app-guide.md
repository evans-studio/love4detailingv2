# Love4Detailing App – Full Build Guide

_Author: Evans Studio • June 2025_

---

## 🎯 Objective

Refactor the Love4Detailing frontend into a **modular, scalable system** with clearly separated public and private flows. Optimize the codebase for **maintainability**, **responsiveness**, and **fast updates**, while ensuring tight alignment with the existing Supabase backend. The system should be intuitive enough for solo management, enabling fast client-requested updates without requiring deep diving into source code files.

---

## 🧭 Core Structure

### 🔓 Public Site (Unauthenticated)
- `/` → Landing page (GSAP orb animation)
- `/book` → Multi-step booking form
- `/confirmation` → Booking success screen

### 🔐 Dashboard (Authenticated)
- `/dashboard` → Main user area
- `/dashboard/book` → Repeat bookings
- `/dashboard/profile` → Saved vehicle + contact info
- `/dashboard/rewards` → Loyalty system (placeholder)

---

## 🛠️ Tech Stack Alignment

| Purpose             | Tech                        | Notes                                 |
|---------------------|-----------------------------|----------------------------------------|
| UI Components       | **ShadCN** + **Radix UI**   | Modern, scalable components            |
| Styling             | **TailwindCSS**             | Utility-first, mobile-first            |
| Animations          | **GSAP**                    | Scoped to landing page only            |
| Forms               | **react-hook-form + zod**   | Consistent validation, clean UX        |
| Backend             | **Supabase**                | Auth, RLS, DB, media storage           |
| Routing             | **Next.js App Router**      | `/app` directory based structure       |

---

## 🔁 Booking User Flow

```mermaid
flowchart TD
  A[Landing Page] --> B[Click "Book Service"]
  B --> C[Enter Reg → DVLA lookup]
  C --> D[Auto-select vehicle size]
  D --> E[Enter user info + upload photos]
  E --> F[Pick date/time]
  F --> G[Submit Booking]
  G --> H[Confirm screen + invoice]
  H --> I[User account auto-created]
  I --> J[Prompt: Set your password]
  J --> K[Dashboard: View/cancel/edit bookings]
```

---

## 🔲 UI Layout & Navigation

### 🔓 Public Site

- **Header**
  - Transparent background with brand logo (left-aligned)
  - CTA ("Book Service") on the right
  - Sticky on scroll with optional fade background

- **Footer**
  - Contact, business hours, social icons, T&Cs

### 🔐 Dashboard Navigation

- **Sidebar Layout** (Desktop + Toggle on Mobile)
  - User Avatar + Badge(s)
  - **Navigation Links:**
    - Dashboard Home `/dashboard`
    - Book Again `/dashboard/book`
    - My Profile `/dashboard/profile`
    - Loyalty + Rewards `/dashboard/rewards`
    - Logout

---

## 📁 Suggested File & Component Structure

```bash
/src
│
├── app
│   ├── page.tsx (Landing)
│   ├── book/page.tsx
│   ├── confirmation/page.tsx
│   └── dashboard/
│       ├── layout.tsx
│       ├── page.tsx (Dashboard home)
│       ├── book/page.tsx
│       ├── profile/page.tsx
│       └── rewards/page.tsx
│
├── components
│   ├── ui/ (ShadCN + custom extensions)
│   ├── layout/Header.tsx
│   ├── layout/Footer.tsx
│   └── layout/DashboardSidebar.tsx
│
├── lib
│   ├── utils/
│   ├── constants/
│   └── api/
│
├── styles/
├── types/
└── data/content.json ← All editable marketing content
```

---

## 💳 Payment System Handling

- **V1:** Cash only – booking summary includes payment instructions
- **Future:** Stripe integration – structure payment flow for later drop-in
- **Agent Note:** Implement payment handler logic using feature flag

```ts
if (paymentMethod === 'cash') {
  // Display summary + instructions
} else {
  // Call Stripe checkout logic
}
```

🎨 Brand Identity

Brand Voice:

Professional, calm, and confident

Clean, premium experience — never feel like an "AI app"

Copy must feel human, not generic or robotic

Brand Colors:

Primary:

Primary Purple: #9747FF

Black Base: #141414

Off-white: #F8F4EB

Secondary:

Stone Grey (Support Accent): #DAD7CE

Surface Light: #262626

Text Muted: #C7C7C7

States:

Error: #BA0C2F

Success: #28C76F

Warning: #FFA726

Info: #29B6F6

Purple Variants:

50: rgba(151, 71, 255, 0.05)

100: rgba(151, 71, 255, 0.1)

200: rgba(151, 71, 255, 0.2)

300: rgba(151, 71, 255, 0.3)

400: rgba(151, 71, 255, 0.4)

500: #9747FF

600: #8532FF

700: #721DFF

800: #5F08FF

900: #4C00F2

These colors must be applied consistently across all interfaces. Use Tailwind tokens or CSS variables for easy replacement across future clones.
---

## ✅ Summary

This single `.md` file defines the entire refactor roadmap. It sets the architecture, backend alignment, frontend flow, and future-proof features for licensing and scaling. All logic, styling, component structure, and user journey is documented and ready to be implemented step-by-step.

Use this as the **source of truth** for rebuilding the Love4Detailing app into a commercial-grade, client-manageable platform.
