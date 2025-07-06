# SYSTEM MINDSET GUIDE – LOVE 4 DETAILING (REBUILD)

## Purpose

This guide is not for implementation. This is a **mental operating system** — a discipline layer designed to keep any AI agent, developer, or contributor **focused, aligned, and precise** throughout the entire build of the Love 4 Detailing app.

This app is being built as a **white-label, licensed system**. Every decision must support **clean code**, **system thinking**, and **zero memory drift**. When in doubt, return to this guide.

---

## 🧭 PRIMARY DIRECTIVES

1. **System Over Screens**

   * Every feature must be a **modular system**, not a one-off UI.
   * Build services, pricing, time slots, rewards, and user flows from central config.
   * Ask: *"If I clone this app tomorrow, can I change this logic or label without touching the core code?"*

2. **Clarity Over Speed**

   * Never guess. Never patch. If a decision point is unclear — **ask, clarify, verify**.
   * Assume this app will be seen by senior devs and licensed commercially.

3. **One Source of Truth**

   * All editable content (text, services, locations, prices) must live in a clearly structured config file — `/lib/constants.ts`, `/data/services.ts`, or similar.
   * Absolutely no hardcoded text inside components or pages.

4. **Role-Aware Architecture**

   * This app has **three distinct user roles**: Public, Authenticated User, and Admin.
   * Each role has its own views, flows, and permissions.
   * Do not blur these roles in routes or logic. Protect every route and action with clean access logic.

5. **AI Agent Discipline**

   * Do not drift.
   * Always re-read this guide before implementing a major feature.
   * Ask before assuming: \_"Is this feature part of a system? Can it be reused? Is the logic clean?"
   * If an issue is recurring (e.g. form validation fails, layout broken), **fix the system** — don’t patch symptoms.

---

## 🏗️ STRUCTURE STANDARDS

### Folders:

* `/app` – Next.js App Router structure
* `/components` – Stateless UI components only
* `/lib` – Reusable logic, validators, helpers
* `/hooks` – Reusable frontend hooks
* `/types` – Shared TypeScript types
* `/data` – Client-editable content (text, services, copy)
* `/api` – Edge/server logic (Supabase, handlers)

### Component Rules:

* Use React Server Components unless a `use client` directive is required
* No inline logic inside components — extract handlers or utilities to `/lib`
* Naming must be scoped and semantically clean (`BookingSummaryCard`, not `Card2`)

### Form Strategy:

* All forms use `react-hook-form` + `zod`
* Each form must:

  * Reference a shared validation schema in `/lib/validation.ts`
  * Be controlled and type-safe
  * Use clear error handling and inline feedback

### Styling:

* Tailwind only
* Spacing, color, and typography must align with brand tokens (stored in `/lib/theme.ts` if needed)
* Responsive layout is not optional — mobile-first, test at every breakpoint

---

## 🔐 BEHAVIORAL GUARDRAILS

### When Writing Code:

* Think modular. Ask: *"Will I need to reuse or adjust this later for a different client?"*
* No mystery props — define types clearly
* No magic numbers or strings — use named constants
* Don’t repeat logic — extract functions, centralize state

### When Building Features:

* Every user-facing action (e.g. button, toggle, form submit) must:

  * Show a clear loading state
  * Return success/failure with appropriate UX feedback
  * Trigger corresponding backend logic if needed

### When Working With AI:

* Always provide the full App Guide as context
* Refer to **this guide before responding to user prompts**
* Maintain continuity — remember app is designed for **licensing and cloning**
* Do not reuse any logic or styling from deprecated versions

---

## 🚨 HARD RULES (DO NOT VIOLATE)

* ❌ Do not hardcode any service, copy, or price into components
* ❌ Do not build pages in isolation — build systems
* ❌ Do not bypass validation, even for testing
* ❌ Do not write duplicate logic across dashboard/public/admin areas
* ❌ Do not ignore route protection or auth gating
* ❌ Do not install libraries without explicit permission
* ❌ Do not handle sensitive data (emails, vehicle reg) without secure .env use

✅ **Always centralize, always validate, always assume scale.**

---

## 🧬 CLOSING PRINCIPLE

> This app is a licensed product, built to be duplicated and adapted. Every decision you make — from naming to logic — must be clean, repeatable, and scalable. Build like someone else is watching. Because they will be.

Read this guide before each build sprint.
Stick to the structure.
Respect the system.

---

**Last reviewed:** June 2025

**Maintainer:** Evans Studio
