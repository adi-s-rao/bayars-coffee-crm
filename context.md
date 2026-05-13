# Bayar's CRM — Context

## What this app is
A field-sales CRM for Bayar's Coffee reps in the UAE. Reps visit cafes, log check-ins with GPS, and track leads through a sales pipeline. Managers review activity, schedule visits, and track conversions.

## Tech stack
- **Next.js 15 App Router** (TypeScript, Tailwind CSS v4)
- **Supabase** (Postgres + RLS + Auth)
- **Leaflet** for maps, **date-fns** for dates, **Sonner** for toasts
- **PWA** with service worker (cache-first for static assets)
- Deployed as a mobile-first web app (iOS 26 Liquid Glass design)

## Roles
| Role    | Can do |
|---------|--------|
| rep     | Create leads, check in, view all leads, see own scheduled visits |
| manager | Everything reps can + schedule visits, import data, view reports |

## Lead statuses
`cold_lead` → `hot_lead` → `customer` (conversion logged) or `competitor`

`demo_scheduled` was removed in migration 002; existing rows migrated to `hot_lead`.

## Database tables (key ones)
| Table | Purpose |
|-------|---------|
| `profiles` | User roles and names (FK from `auth.users`) |
| `leads` | Cafe prospects with GPS, sample given, bean usage |
| `checkins` | GPS check-ins per lead or start/end day events |
| `scheduled_visits` | Manager-assigned visit schedule per rep |
| `conversions` | Conversion record when lead becomes customer |

## Check-in types
`visit`, `demo`, `workshop`, `start_day`, `end_day`, `new_lead`

`new_lead` is auto-inserted server-side whenever a rep creates a lead with GPS coords — participates in daily KM trail without manual action.

## KM trail
Every check-in (except `start_day`) records `distance_from_previous_km` (Haversine from previous today checkin). Summed in `GET /api/checkins/today` as `totalKm`. Both `visit` types and `new_lead` are counted.

## Geofencing
Check-ins >100m from the lead's saved GPS are flagged: `[FLAGGED: Xm away]` prepended to remarks. Managers see these in Reports and the notification bell.

## Conversions
Status change to `customer` in LeadDetailsDrawer opens ConversionModal (bean type SKU + quantity kg + notes). POSTs to `/api/conversions`, PATCHes lead status.

## Scheduled visits
Managers create via NewScheduleModal (Calendar FAB) or ScheduleModal (Lead list). POSTs to `/api/scheduled-visits` with `assigned_to` rep. Reps see their own; managers see all. Completed via PATCH `{ completed: true }`.

## Sample tracking
`sample_name` (from `COFFEE_SKUS`) and `sample_quantity_grams` on leads. Aggregated in reports summary as `totalSampleGrams`.

## Start Day guard
`handleStartDay` calls `GET /api/checkins/today` first. If `hasStartDay === true` (a `start_day` checkin exists today), it blocks with a toast — prevents double-start across devices.
