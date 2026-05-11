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

## Deployment

- **Frontend**: Vercel (connect GitHub repo, set env vars in project settings)
- **Backend**: Supabase (nkmibqhqotklxeuyiwcp project)
- **DB migrations**: Supabase Studio or `supabase db push`
- **Type generation**: `pnpm supabase gen types typescript --project-id nkmibqhqotklxeuyiwcp > src/types/database.ts`
