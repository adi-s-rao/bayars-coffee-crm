# Bayar's CRM — Runbook

## Database migrations

Migrations live in `supabase/migrations/`. Run them in order via the Supabase dashboard SQL editor or the CLI:

```bash
supabase db push
# or manually:
supabase migration up
```

Migration files:
- `001_initial_schema.sql` — baseline tables, RLS policies, indexes
- `002_business_logic.sql` — removes deprecated lead columns, adds sample tracking, adds `scheduled_visits` and `conversions` tables, migrates `demo_scheduled` → `hot_lead`

**Before running 002:** ensure no application code still references `demo_scheduled`, `scheduled_date`, `scheduled_type`, `bean_price_per_kg`, `menu_image_url`, `demo_date`, `quoted_price`, `quoted_bean_name`, `calibration_visit_date`, `visit_notes`, `cs_handover_date` on leads.

---

## Local development

```bash
pnpm install
pnpm dev          # starts Next.js on http://localhost:3000
```

Environment variables required (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # used by admin client in API routes
```

---

## Build & type-check

```bash
pnpm tsc --noEmit   # type-check only, no output files
pnpm build          # production build (also type-checks)
```

Fix any TypeScript errors before deploying. The build must pass cleanly.

---

## Deployment

The app is deployed as a Next.js static/SSR app. Push to the main branch triggers CI/CD (Vercel or equivalent). The service worker (`public/sw.js`) caches static assets; bump the cache version string if you need to force a cache bust.

---

## Adding a new user

1. Invite the user via Supabase Auth (dashboard → Authentication → Users → Invite).
2. After sign-up, set their role in the `profiles` table:
   ```sql
   UPDATE profiles SET role = 'rep', full_name = 'Name Here' WHERE id = '<user-uuid>';
   ```
   Valid roles: `rep`, `manager`.

---

## Resetting a user's password

Use Supabase Auth dashboard → Users → select user → Send password reset email. Do not manually update the `auth.users` table.

---

## Troubleshooting

### Check-in fails with "Failed to submit"
- Confirm the user has GPS enabled in browser permissions.
- Check `/api/checkins` server logs for Supabase insert errors.
- Verify the `checkins_type_check` constraint includes all active types (`visit`, `demo`, `workshop`, `start_day`, `end_day`, `new_lead`).

### "Day already started" on fresh device
- A `start_day` checkin exists for today in the database for that user.
- Either the rep already started day on another device (expected), or the checkin was created erroneously.
- To clear: `DELETE FROM checkins WHERE user_id = '<uuid>' AND type = 'start_day' AND created_at >= CURRENT_DATE;`

### Geofence flags accumulating
- Flagged check-ins appear in Reports and the manager notification bell.
- They are stored with `[FLAGGED: Xm away]` prepended to `remarks`.
- No automated action; managers review and follow up with reps.

### Import failing for some rows
- The import endpoint returns `{ imported, failed, errors }`.
- Common causes: `status` value not in (`cold_lead`, `hot_lead`, `customer`, `competitor`), duplicate cafe names (not blocked but worth reviewing), malformed numeric fields.

### Scheduled visit not appearing for rep
- Confirm `assigned_to` is set to the rep's user ID (not created_by).
- RLS on `scheduled_visits` filters SELECT by `assigned_to = auth.uid()` for rep role.

### Conversion modal not opening
- ConversionModal opens only when status is changed to `customer` via the status select in LeadDetailsDrawer.
- If the lead is already `customer` and you need to log a conversion manually, POST directly to `/api/conversions` with `{ lead_id, bean_type, beans_ordered_kg, notes }`.

---

## Key API endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/leads` | rep/manager | List all leads |
| POST | `/api/leads` | rep/manager | Create lead + auto new_lead checkin |
| PATCH | `/api/leads/:id` | rep/manager | Update lead fields |
| GET | `/api/checkins/today` | rep/manager | Today's checkin count, km, hasStartDay |
| POST | `/api/checkins` | rep/manager | Log a check-in |
| GET | `/api/scheduled-visits` | rep/manager | Rep: own visits. Manager: all |
| POST | `/api/scheduled-visits` | manager | Create scheduled visit |
| PATCH | `/api/scheduled-visits/:id` | rep/manager | Mark complete or edit |
| DELETE | `/api/scheduled-visits/:id` | manager | Remove visit |
| GET | `/api/conversions` | manager | All conversions |
| POST | `/api/conversions` | rep/manager | Log conversion |
| GET | `/api/reports/summary` | manager | Aggregated stats |
| POST | `/api/import/leads` | manager | Bulk import from CSV |
| GET | `/api/geocode` | rep/manager | Reverse-geocode lat/lng |
| GET | `/api/team/members` | manager | List all rep profiles |
