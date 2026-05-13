-- simulate-day-READY.sql
-- Ready to run. User ID: 80e81c16-6ff2-4f27-afc5-1eea5f41d989 (Adithya rao)
-- Run in Supabase SQL Editor. Simulates a full rep day around Bengaluru.
-- Expected KM total: ~40.85 km

-- ── Step 1: Clean up any existing today's checkins for clean test ─────────
DELETE FROM public.checkins
WHERE user_id = '80e81c16-6ff2-4f27-afc5-1eea5f41d989'
  AND created_at::date = CURRENT_DATE;

-- ── Step 2: Insert 6 synthetic checkins ──────────────────────────────────
INSERT INTO public.checkins
  (id, user_id, user_name, type, latitude, longitude,
   distance_from_previous_km, remarks, created_at)
VALUES
  -- 1. start_day — Koramangala (distance always NULL)
  (gen_random_uuid(),
   '80e81c16-6ff2-4f27-afc5-1eea5f41d989',
   'Adithya rao', 'start_day',
   12.9352, 77.6245, NULL, 'Start day - Koramangala',
   CURRENT_DATE + TIME '09:00:00'),

  -- 2. visit — Indiranagar (~5.0 km from Koramangala)
  (gen_random_uuid(),
   '80e81c16-6ff2-4f27-afc5-1eea5f41d989',
   'Adithya rao', 'visit',
   12.9784, 77.6408, NULL, 'Blue Tokai - Indiranagar',
   CURRENT_DATE + TIME '09:45:00'),

  -- 3. visit — HSR Layout (~7.5 km from Indiranagar)
  (gen_random_uuid(),
   '80e81c16-6ff2-4f27-afc5-1eea5f41d989',
   'Adithya rao', 'visit',
   12.9116, 77.6389, NULL, 'Third Wave - HSR Layout',
   CURRENT_DATE + TIME '11:00:00'),

  -- 4. demo — Whitefield (~15.5 km from HSR)
  (gen_random_uuid(),
   '80e81c16-6ff2-4f27-afc5-1eea5f41d989',
   'Adithya rao', 'demo',
   12.9698, 77.7499, NULL, 'Matteo Coffee - Whitefield',
   CURRENT_DATE + TIME '13:30:00'),

  -- 5. visit — MG Road (~12.8 km from Whitefield)
  (gen_random_uuid(),
   '80e81c16-6ff2-4f27-afc5-1eea5f41d989',
   'Adithya rao', 'visit',
   12.9757, 77.6073, NULL, 'Cafe Coffee Day - MG Road',
   CURRENT_DATE + TIME '15:30:00'),

  -- 6. end_day — MG Road (same area, ~0.05 km)
  (gen_random_uuid(),
   '80e81c16-6ff2-4f27-afc5-1eea5f41d989',
   'Adithya rao', 'end_day',
   12.9760, 77.6070, NULL, 'End day - MG Road',
   CURRENT_DATE + TIME '17:00:00');

-- ── Step 3: Compute Haversine distances (same as API logic) ──────────────
UPDATE public.checkins c
SET distance_from_previous_km = sub.km
FROM (
  WITH ordered AS (
    SELECT
      id,
      type,
      latitude,
      longitude,
      created_at,
      LAG(latitude)  OVER (PARTITION BY user_id, created_at::date ORDER BY created_at) AS prev_lat,
      LAG(longitude) OVER (PARTITION BY user_id, created_at::date ORDER BY created_at) AS prev_lon
    FROM public.checkins
    WHERE user_id = '80e81c16-6ff2-4f27-afc5-1eea5f41d989'
      AND created_at::date = CURRENT_DATE
  )
  SELECT
    id,
    CASE
      WHEN type = 'start_day' THEN NULL          -- start_day always NULL
      WHEN prev_lat IS NULL   THEN NULL
      ELSE ROUND((
        6371 * 2 * ASIN(SQRT(
          POWER(SIN((RADIANS(latitude) - RADIANS(prev_lat)) / 2), 2) +
          COS(RADIANS(prev_lat)) * COS(RADIANS(latitude)) *
          POWER(SIN((RADIANS(longitude) - RADIANS(prev_lon)) / 2), 2)
        ))
      )::numeric, 2)
    END AS km
  FROM ordered
) sub
WHERE c.id = sub.id
  AND c.user_id = '80e81c16-6ff2-4f27-afc5-1eea5f41d989'
  AND c.created_at::date = CURRENT_DATE;

-- ── Step 4: Verify results ────────────────────────────────────────────────
SELECT
  type,
  remarks,
  ROUND(distance_from_previous_km::numeric, 2) AS km,
  created_at::time AS time
FROM public.checkins
WHERE user_id = '80e81c16-6ff2-4f27-afc5-1eea5f41d989'
  AND created_at::date = CURRENT_DATE
ORDER BY created_at;

-- ── Step 5: Total KM for the day ─────────────────────────────────────────
SELECT
  ROUND(SUM(distance_from_previous_km)::numeric, 2) AS total_km_today
FROM public.checkins
WHERE user_id = '80e81c16-6ff2-4f27-afc5-1eea5f41d989'
  AND created_at::date = CURRENT_DATE;
-- Expected: ~40.85 km
-- start_day contributes NULL (excluded from SUM), which is correct.
