# Bayar's Coffee CRM — Project Context

## Purpose
SFA (Sales Force Automation) CRM for a cafe sales team. Field reps log visits, create leads, and track the sales pipeline. Managers see reports, analytics, and team activity.

## Tech Stack

| Technology | Version | Reason |
|---|---|---|
| Next.js | 16.x | App Router, RSC, built-in API routes, excellent Vercel integration |
| React | 19.x | Concurrent features, server components |
| TypeScript | 5.x (strict) | Type safety across the entire codebase |
| Tailwind CSS | 4.x | Utility-first CSS, fastest iteration for UI |
| shadcn/ui | 4.x | Accessible, unstyled-base components, copy-paste model |
| Supabase | 2.x | Postgres + Auth + Storage in one, generous free tier |
| @supabase/ssr | 0.10.x | Official SSR helpers for cookie-based session management |
| pnpm | 11.x | Faster installs, strict dependency isolation |
| date-fns | 4.x | Lightweight date utilities |
| lucide-react | 1.x | Consistent icon set |
| react-leaflet + leaflet | 5.x / 1.x | Map views for lead locations and check-in GPS data |
| clsx + tailwind-merge | — | Type-safe conditional class composition |

## Folder Structure

```
src/
├── app/
│   ├── (auth)/login/       # Login page (public route)
│   ├── (dashboard)/        # Protected layout + pages
│   │   ├── layout.tsx      # Dashboard shell
│   │   └── dashboard/      # Main dashboard page
│   ├── api/auth/callback/  # Supabase OAuth callback handler
│   ├── layout.tsx          # Root HTML layout
│   └── globals.css         # Global styles + Tailwind tokens
├── components/
│   └── ui/                 # shadcn generated components
├── lib/
│   ├── supabase/
│   │   ├── client.ts       # Browser-side Supabase client
│   │   ├── server.ts       # Server-side Supabase client (RSC / Route Handlers)
│   │   └── middleware.ts   # Session refresh helper used by middleware
│   └── utils.ts            # cn() helper
├── middleware.ts            # Route protection + session refresh
└── types/
    ├── database.ts         # Generated Supabase DB types (run gen types to update)
    └── index.ts            # Shared domain types (Profile, Lead, CheckIn)
```

## Environment Variables

| Variable | Used in | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL (safe to expose) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anon key — RLS enforces access rules |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS — only for admin/migration scripts |

## Auth Flow

1. User visits `/login`, submits email + password form
2. Supabase issues a JWT stored in an HTTP-only cookie via `@supabase/ssr`
3. Every request hits `src/middleware.ts` which calls `updateSession()` to refresh the cookie
4. Routes under `/dashboard` check for a valid `user` object — redirect to `/login?next=...` if missing
5. OAuth flows (Google, etc.) redirect to `/api/auth/callback` which exchanges the code for a session

## Data Model

### Profile
Extends the Supabase auth user. Stores role (`rep` | `manager`), full name, avatar, and phone. Created automatically via a DB trigger when a user signs up.

### Lead
Core entity. A cafe prospect or customer owned by a rep. Tracks:
- Location (lat/lng + address)
- Contact (POC name and number)
- Coffee intel (machine, current bean brand, usage in kg, pricing)
- Pipeline stage (`cold_lead` → `hot_lead` → `demo_scheduled` → `customer`)
- Demo and calibration dates, quoted pricing
- Competitor tracking

### CheckIn
GPS-verified visit log. A rep checks in at a Lead location. Types: `visit`, `demo`, `workshop`, `start_day`, `end_day`. Captures GPS coordinates, distance from previous check-in, remarks, and bean samples used.

### Relationships
- `Profile.id` → `auth.users.id` (1:1)
- `Lead.created_by` → `Profile.id` (many:1)
- `CheckIn.user_id` → `Profile.id` (many:1)
- `CheckIn.lead_id` → `Lead.id` (optional many:1)

## Key Design Decisions

### Server vs Client Components
Default to Server Components for data fetching (zero client JS shipped). Use `'use client'` only for interactive components (forms, maps, dropdowns).

### API Routes for DB writes
All mutations go through Next.js Route Handlers (`/api/...`) so the service role key never reaches the browser.

### RLS (Row Level Security)
All Supabase tables have RLS enabled. Reps can only see their own leads; managers see all. Policy definitions live in the Supabase dashboard migrations.

### Strict TypeScript
`tsconfig.json` has `strict: true` with no `ignoreBuildErrors`. All types flow from `src/types/index.ts` and the generated `src/types/database.ts`.

## How to Run Locally

```bash
# 1. Copy env file and fill in values
cp .env.local.example .env.local   # or edit .env.local directly

# 2. Install dependencies
pnpm install

# 3. Start dev server
pnpm dev

# 4. Open http://localhost:3000
```

## Database Schema

### profiles
Mirrors `auth.users` (1:1). Created automatically by the `handle_new_user` trigger on signup.

| Column | Type | Notes |
|---|---|---|
| id | uuid | FK → auth.users |
| full_name | text | From sign-up form or email prefix |
| role | text | `'rep'` \| `'manager'`, default `'rep'` |
| email | text | Copied from auth.users |
| phone | text | Optional |
| avatar_url | text | Optional, stored in Supabase Storage |
| created_at / updated_at | timestamptz | Auto-managed by trigger |

### leads
Core entity. One lead = one cafe prospect or customer.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| created_by | uuid | FK → profiles |
| status | text | Pipeline stage enum |
| cafe_name | text | Display name |
| latitude / longitude | float8 | GPS for map view |
| location_address | text | Human-readable address |
| poc_name / poc_contact | text | Point of contact |
| coffee_machine | text | Machine in use |
| current_bean_brand | text | Competitor brand |
| bean_usage_kg | numeric | Monthly usage |
| bean_price_per_kg | numeric | What they currently pay |
| cappuccino_price | numeric | Menu price |
| menu_image_url | text | Photo from Supabase Storage menus bucket |
| remarks | text | Free-text notes |
| demo_date | timestamptz | When demo was/is scheduled |
| quoted_price / quoted_bean_name | numeric / text | Our offer |
| calibration_visit_date | timestamptz | Post-demo calibration |
| visit_notes | text | Notes from calibration |
| cs_handover_date | timestamptz | When handed to CS team |
| scheduled_date / scheduled_type | timestamptz / text | Next planned visit |

### checkins
GPS-verified visit log. Reps check in from the field.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| lead_id | uuid | Optional FK → leads |
| user_id | uuid | FK → profiles |
| user_name | text | Denormalized for fast reads |
| type | text | `visit`, `demo`, `workshop`, `start_day`, `end_day` |
| latitude / longitude | float8 | Captured GPS |
| remarks | text | Visit notes |
| gate_pass_number | text | For buildings with access control |
| beans_used / bean_brand / bean_amount_kg | bool / text / numeric | Sample tracking |
| distance_from_previous_km | float8 | Odometer delta |

### Migration file
`supabase/migrations/001_initial_schema.sql` — run this once in the Supabase SQL editor.

## Auth Flow (detailed)

1. **Sign-up**: User submits full_name + email + password on `/login` (Sign Up tab)
2. Supabase creates a row in `auth.users`, storing `full_name` in `raw_user_meta_data`
3. **Trigger** `handle_new_user` fires `AFTER INSERT ON auth.users`, inserts into `public.profiles`
4. If email confirmation is enabled: user clicks link → confirmed
5. **Sign-in**: User submits email + password
6. Supabase issues a JWT, stored as an HTTP-only cookie via `@supabase/ssr`
7. **Middleware** runs on every request: `updateSession()` refreshes the cookie; checks for user on `/dashboard` routes, redirects to `/login` if missing
8. **Dashboard**: Server Component calls `createClient()`, fetches profile from `public.profiles`
9. **Sign-out**: POST to `/api/auth/signout` → `supabase.auth.signOut()` → redirect to `/login`

## RLS Strategy

All three tables have RLS enabled. The pattern is:
- **Own-row access**: `auth.uid() = owner_column` — reps see only their rows
- **Manager override**: sub-select `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')` — managers see everything
- **WITH CHECK** mirrors USING on write policies to prevent privilege escalation

The `handle_new_user` trigger runs as `SECURITY DEFINER` with `search_path = public` to safely insert into `profiles` even though the trigger fires in the `auth` schema context.

## Storage Bucket: menus

- Bucket name: `menus`, public (images are accessible without auth)
- Upload path enforced by RLS: `authenticated` users can only write to `{their_uid}/*`
- Read is open to the public (serves menu photos in the UI)
- Bucket created by the migration SQL (`INSERT … ON CONFLICT DO NOTHING` for idempotency)

## Component Map

### Dashboard Shell (`src/components/dashboard/DashboardShell.tsx`)
Client Component. Wraps all dashboard pages. Renders:
- **Top Navbar**: hamburger icon, app name, bell, avatar with initials
- **Day Status Bar**: Start/End Day buttons with GPS check-in; persists state to `localStorage('bayars_day_state')` across refreshes
- **Bottom Nav**: Home / Map / Calendar / Reports — active tab highlighted in amber using `usePathname`

### LeadListView (`src/components/dashboard/LeadListView.tsx`)
Client Component. Receives `leads` and `profile` from the Server Page.
- Stats row: Leads Today (from created_at), Check-ins (live from `/api/checkins/today`), KM Today (live from `/api/checkins/today`)
- Search: filters leads by `cafe_name` substring
- Filter pills: All / Cold Lead / Hot Lead / Demo / Customer / Competitor
- Lead cards: status dot + badge, POC info, last-visit approximation from `updated_at`
- Floating `+` button opens NewLeadModal
- Orchestrates open/close state for all four modals (drawer, check-in, new lead, schedule)

### LeadDetailsDrawer (`src/components/dashboard/LeadDetailsDrawer.tsx`)
Client Component. Right-side panel (full-width on mobile, 400px on desktop) with animated tab underline.
- **Overview tab**: address, POC, editable status dropdown, editable remarks textarea
- **Coffee Details tab**: click-to-edit inline fields for machine, bean brand, pricing
- **Activity tab**: fetches `GET /api/leads/[id]/checkins` on open, renders timeline with type-colored dots
- Footer: Save Changes (PATCH /api/leads/[id]) + Delete Lead (DELETE)

### CheckInModal (`src/components/dashboard/CheckInModal.tsx`)
Client Component. Bottom-sheet on mobile, centered dialog on desktop.
- Type selector: Visit / Demo / Workshop
- GPS capture button → shows green confirmation on success
- Remarks, gate pass, beans-used toggle (expands to brand + amount fields)
- Submits to `POST /api/checkins`; disabled until GPS captured

### NewLeadModal (`src/components/dashboard/NewLeadModal.tsx`)
Client Component. Same layout as CheckInModal.
- Fields: Cafe Name, Status (select), GPS + auto-filled address (via `/api/geocode` proxy), POC Name, POC Contact (validated regex), Remarks
- Submits to `POST /api/leads`; calls `onCreated` to add to parent list state

### ScheduleModal (`src/components/dashboard/ScheduleModal.tsx`)
Client Component. Same bottom-sheet pattern as CheckInModal.
- Visit type selector: Visit / Demo / Workshop
- Native date picker (min = today) + time picker (defaults to 10:00)
- Optional notes textarea
- Submits PATCH `/api/leads/[id]` with `{ scheduled_date, scheduled_type }`
- On success: calls `onScheduled(updatedLead)`, closes, shows "Visit scheduled!" toast

## Distance Calculation System

Every check-in records GPS coordinates. The `POST /api/checkins` route:
1. Queries the most recent check-in for the same `user_id`
2. If the previous check-in has GPS data, calculates Haversine great-circle distance
3. Stores result in `distance_from_previous_km` (rounded to 2 decimal places)
4. Skips distance calculation for `start_day` type (it's the anchor point)

This enables per-day KM tracking (sum all checkins' distances for today).

**Haversine formula** is computed server-side in the route handler — no external geocoding service needed for this calculation.

## GPS Attendance Flow

1. Rep clicks **Start Day** → browser requests GPS permission
2. On success: `POST /api/checkins { type: 'start_day', lat, lng }` — server calculates 0 distance (first check-in)
3. State saved to `localStorage('bayars_day_state')` with `startTime` and `startCheckinId`
4. Day Status Bar turns green with pulsing dot and formatted start time
5. Throughout the day, every `visit/demo/workshop` check-in auto-calculates distance from the previous entry
6. Rep clicks **End Day** → GPS captured → `POST /api/checkins { type: 'end_day' }` → localStorage cleared

## Today's Stats API

`GET /api/checkins/today` — returns live stats for the authenticated rep for the current calendar day.

Response: `{ checkInCount: number, totalKm: number }`

- `checkInCount`: number of checkins with type `visit`, `demo`, or `workshop` (excludes `start_day`/`end_day`)
- `totalKm`: sum of `distance_from_previous_km` across all today's checkins (rounded to 1 decimal)

Queried on mount in `LeadListView` to power the Check-ins and KM Today stat cards.

## Geocoding

Reverse geocoding is proxied through `/api/geocode?lat=X&lon=Y` to allow setting the required `User-Agent` header (browsers block this from client-side fetch). Uses Nominatim OpenStreetMap API.

## Deployment

- **Frontend**: Vercel (connect GitHub repo, set env vars in project settings)
- **Backend**: Supabase (nkmibqhqotklxeuyiwcp project)
- **DB migrations**: Supabase Studio or `supabase db push`
- **Type generation**: `pnpm supabase gen types typescript --project-id nkmibqhqotklxeuyiwcp > src/types/database.ts`
