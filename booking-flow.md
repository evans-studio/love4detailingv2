Booking Flow Scope

🔧 Overview

This file outlines the full implementation scope for the Love4Detailing booking system. It serves as a clear technical reference for maintaining the booking flow, database architecture, and Supabase integration. All features must align with the principles in app-guide.md and mindset.md. This document assumes no prior implementation and removes ambiguity by ensuring all requirements are explicitly stated.

✅ Current System Capabilities

Multi-step booking flow:

Vehicle Registration (DVLA API)

Personal Details input

Date & Time selection (5 slots/day between 10:00–18:00)

Booking Summary + Confirmation

Features:

Centralized content via /data

Zod validation layer

Context-based state management

Supabase integration (auth, DB, media)

Email confirmation via Resend

Tailwind CSS responsive styling

Error boundaries and loading states

📁 Supabase Table Overview (As of June 2025)

Table Name

Description

users

Stores registered users with personal info fields

vehicles

Vehicle info pulled from DVLA API or manually entered (reg, model, etc.)

bookings

Booking records with foreign keys to users, vehicles, and time_slots

services

🚨 To be renamed: represents vehicle size tiers, not service types

loyalty_points

Tracks points and tier levels for rewards system

time_slots

Predefined time slots (5 per day between 10:00–18:00)

admin_notes

Internal table for admin-only annotations or override actions

✅ RLS must be enforced on all user-facing tables

🔄 Changes Required:

Rename services → vehicle_sizes or similar

Ensure bookings includes:

FK: user_id, vehicle_id, time_slot_id

JSONB field for size-based pricing snapshot

Booking status enum (pending, confirmed, cancelled)

Booking reference string

🧠 Flow Breakdown (Step-by-Step)

Step 1: Vehicle Registration (DVLA API)

One input: UK vehicle reg

Auto-fills vehicle data from DVLA

Vehicle data stored to vehicles table

On success → proceed to next step

Step 2: Personal Details

Autofill from user profile (users table)

If missing fields (first time), show required inputs:

Name, Phone, Email, Address

On submit, write/update users table

Step 3: Time Slot Selection

Display 5 available slots per day (10:00, 11:30, 13:00, 14:30, 16:00)

Prevent double-booking via Supabase RLS

On select → reserve time via time_slots + confirm

Step 4: Booking Review + Confirmation

Show full summary (vehicle, user, time)

“Confirm Booking” triggers:

DB insert to bookings

Points award (if enabled)

Redirect to /dashboard

Send email via Resend

🛡 Auth & Redirect Logic

On booking init:

If not signed in → redirect to /sign-in

If first-time user:

Prompt to create password on registration

Post-password creation → redirect to /dashboard

All pages protected via Supabase session

🗂 SQL Schema Notes (for agent execution)

If the AI agent is unable to create these directly due to permission issues, generate the full SQL creation script as markdown (schema.sql.md) with:

Table structures for all 7 tables

Foreign key relationships

ENUMs for statuses and tiers

Indexing strategies

RLS policies for:

users: self-access only

vehicles: linked to user

bookings: user-specific only

loyalty_points: per-user access

🧹 Codebase Hygiene

Delete or rename any components tied to old service selection logic

Clean up stale pages and UI fragments not used in the current flow

Ensure all logic is system-based, not hardcoded (tokens, text, etc)

✅ Ready for Next Steps:

Final confirmation that booking works E2E

Create reward tier logic and display triggers

Configure admin panel for manual override/editing

Start Stripe payment integration (if applicable)

This file is maintained by Evans Studio — do not assume features are built unless explicitly marked above.

