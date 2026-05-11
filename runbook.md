# Bayar's Coffee CRM — Runbook

Error log and solutions encountered during development. Newest entries at the top of each section.

---

## Setup

Project scaffolded with Next.js 16 (latest), TypeScript strict, Tailwind v4, shadcn/ui v4, pnpm 11.

### 2026-05-11 — Initial scaffold

**Action:** Ran `npx create-next-app@latest bayars-coffee-crm --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes`

**Note:** `create-next-app@latest` installed Next.js 16.2.6 (not 15 as originally planned — 16 is the current stable in May 2026). App Router patterns are identical.

**Files changed:** All files in project root, `src/app/`, `public/`

---

### 2026-05-11 — pnpm build script approvals

**Error:** `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: sharp@0.34.5, unrs-resolver@1.11.1, msw@2.14.5`

**Cause:** pnpm 11 requires explicit approval for packages that run build scripts (native addon compilation). Security feature introduced in pnpm 9.

**Fix:** Added `"pnpm": { "onlyBuiltDependencies": ["msw", "sharp", "unrs-resolver"] }` to `package.json`. Deleted `pnpm-lock.yaml` and re-ran `pnpm install`.

**Files changed:** `package.json`

---

### 2026-05-11 — shadcn toast deprecated

**Error:** `The toast component is deprecated. Use the sonner component instead.`

**Cause:** shadcn v4 replaced the Radix-based toast with Sonner.

**Fix:** Used `sonner` instead of `toast` in the component add command.

**Files changed:** `src/components/ui/sonner.tsx` added; no `toast.tsx`

---

## Database & Auth

### 2026-05-11 — Migration 001_initial_schema.sql created

**Action:** Created `supabase/migrations/001_initial_schema.sql` with:
- Tables: `profiles`, `leads`, `checkins`
- Triggers: `handle_updated_at` (profiles + leads), `handle_new_user` (auth.users → profiles)
- RLS policies on all three tables (rep own-row + manager full-access pattern)
- Storage bucket `menus` (public, upload restricted to own uid path)
- Indexes on `leads(created_by, status, created_at)` and `checkins(user_id, lead_id, created_at, type)`

**How to run:** Supabase dashboard → SQL Editor → paste file contents → Run

**Files changed:** `supabase/migrations/001_initial_schema.sql`

---

### 2026-05-11 — Auth page shadcn components

**Components used in `src/app/(auth)/login/page.tsx`:**
- `Tabs / TabsList / TabsTrigger / TabsContent` — Sign In / Sign Up switcher, avoids two separate pages
- `Button` — full-width submit with `disabled` state during loading
- `Input` — standard email, password, text fields with `autoComplete` set
- `Label` — accessible labels linked via `htmlFor`
- `Loader2` from lucide-react with `animate-spin` — spinner during async auth calls

**Why Tabs instead of two pages:** Single-route auth keeps the URL as `/login` regardless of mode; no redirect flash when switching between sign-in and sign-up.

---

### 2026-05-11 — Email confirmation disabled for development

**Note:** In Supabase dashboard → Authentication → Settings → "Enable email confirmations" should be toggled OFF during development so sign-ups immediately activate without needing to click an email link. Re-enable before production.

**Files changed:** Supabase dashboard setting only (no code change)

---

## Core UI Build

### 2026-05-11 — Components created

**Files created:**
- `src/lib/supabase/admin.ts` — service role client for checkin insertion
- `src/app/api/checkins/route.ts` — POST with Haversine distance
- `src/app/api/leads/route.ts` — GET (role-aware) + POST
- `src/app/api/leads/[id]/route.ts` — GET + PATCH + DELETE (RLS via server client)
- `src/app/api/leads/[id]/checkins/route.ts` — GET activity for drawer
- `src/app/api/geocode/route.ts` — Nominatim reverse geocode proxy
- `src/components/dashboard/DashboardShell.tsx` — layout shell
- `src/components/dashboard/LeadListView.tsx` — main lead list
- `src/components/dashboard/LeadDetailsDrawer.tsx` — edit drawer
- `src/components/dashboard/CheckInModal.tsx` — GPS check-in
- `src/components/dashboard/NewLeadModal.tsx` — create lead

---

### 2026-05-11 — GPS + Haversine approach

**Approach chosen:** Server-side Haversine formula in the checkins route.

**Why Haversine over PostGIS:** No PostGIS extension needed on the Supabase free tier. Haversine is accurate to ~0.3% for distances under 1000km, which is sufficient for city-level field rep tracking. If precision becomes a concern, a PostGIS `ST_DistanceSphere` call can replace the JS implementation.

**Why server-side:** The distance is a derived value that should be immutable once stored. Computing it server-side (not client-side) prevents a rep from reporting a manipulated distance.

---

### 2026-05-11 — Schedule button placeholder

**Note:** The "Schedule" button in lead cards shows `toast.info('Schedule feature coming soon')`. A `ScheduleModal` component was deferred — it requires a date picker and lead `scheduled_date`/`scheduled_type` update flow.

---

### 2026-05-11 — updated_at used for "Last visit" approximation

**Note:** The lead card's "Last visit" label derives from `updated_at`, not from checkin timestamps. This is an approximation — `updated_at` changes on any field edit, not just visits. Accurate last-visit display requires a join to the checkins table. Deferred until the dashboard stats row is wired up.

---

## Future entries

Use this format:

### [DATE] — [Short description]
**Error:** ...
**Cause:** ...
**Fix:** ...
**Files changed:** ...
