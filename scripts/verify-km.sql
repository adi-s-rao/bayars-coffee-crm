-- verify-km.sql
-- Validates that KM totals are computed correctly per-day.
-- Expected: distance_from_previous_km is NULL for start_day rows,
--           and non-NULL only for same-day checkins.

-- ── 1. Show all today's checkins with KM values ────────────────────────────
SELECT
  c.id,
  c.type,
  c.created_at::timestamptz AT TIME ZONE 'Asia/Kolkata' AS local_time,
  c.latitude,
  c.longitude,
  c.distance_from_previous_km,
  c.remarks
FROM checkins c
WHERE c.created_at::date = CURRENT_DATE
ORDER BY c.created_at;

-- ── 2. Per-user KM total for today ────────────────────────────────────────
SELECT
  c.user_id,
  p.full_name,
  COUNT(*) FILTER (WHERE c.type NOT IN ('start_day', 'end_day')) AS visit_checkins,
  ROUND(SUM(c.distance_from_previous_km)::numeric, 2)            AS total_km_today
FROM checkins c
JOIN profiles p ON p.id = c.user_id
WHERE c.created_at::date = CURRENT_DATE
GROUP BY c.user_id, p.full_name
ORDER BY total_km_today DESC;

-- ── 3. Verify: start_day rows must always have NULL distance ──────────────
SELECT
  id,
  user_id,
  created_at,
  distance_from_previous_km
FROM checkins
WHERE type = 'start_day'
  AND distance_from_previous_km IS NOT NULL;
-- Should return 0 rows if the fix is correct.

-- ── 4. Cross-day leakage check: distance should never reference yesterday ─
-- (All distances are computed from same-day rows; no row should pull
--  a previous checkin created before today's midnight.)
SELECT
  c.id,
  c.created_at,
  c.distance_from_previous_km,
  prev.created_at AS prev_checkin_date
FROM checkins c
-- Hypothetical: if we stored a prev_checkin_id we could join here.
-- In practice, verify via the API logic in /api/checkins/route.ts.
-- This query acts as a manual audit placeholder.
WHERE c.created_at::date = CURRENT_DATE
  AND c.distance_from_previous_km IS NOT NULL
ORDER BY c.created_at;
