-- simulate-day.sql
-- Populates checkins for a synthetic "today" to validate KM calculation.
-- Run against your Supabase project via psql or the SQL editor.
-- Replace :user_id and :lead_id with real UUIDs from your profiles/leads tables.

-- ── Setup ───────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- replace with real profile id
  v_lead_id UUID := '00000000-0000-0000-0000-000000000002'; -- replace with real lead id
  v_today   DATE := CURRENT_DATE;
BEGIN

  -- Delete any prior simulation rows for this user today
  DELETE FROM checkins
  WHERE user_id = v_user_id
    AND created_at::date = v_today
    AND remarks LIKE '[SIM]%';

  -- Check-in 1: start_day at HQ (Bangalore — 12.9716, 77.5946)
  INSERT INTO checkins (user_id, lead_id, type, latitude, longitude, distance_from_previous_km, remarks, created_at)
  VALUES (
    v_user_id, v_lead_id, 'start_day',
    12.9716, 77.5946,
    NULL,   -- start_day always gets NULL distance
    '[SIM] Start of day at HQ',
    (v_today || ' 09:00:00+05:30')::timestamptz
  );

  -- Check-in 2: visit to café A (Indiranagar — 12.9784, 77.6408 ≈ 5.1 km)
  INSERT INTO checkins (user_id, lead_id, type, latitude, longitude, distance_from_previous_km, remarks, created_at)
  VALUES (
    v_user_id, v_lead_id, 'visit',
    12.9784, 77.6408,
    5.1,
    '[SIM] Visit café A',
    (v_today || ' 10:30:00+05:30')::timestamptz
  );

  -- Check-in 3: visit to café B (Koramangala — 12.9352, 77.6245 ≈ 5.3 km from A)
  INSERT INTO checkins (user_id, lead_id, type, latitude, longitude, distance_from_previous_km, remarks, created_at)
  VALUES (
    v_user_id, v_lead_id, 'visit',
    12.9352, 77.6245,
    5.3,
    '[SIM] Visit café B',
    (v_today || ' 12:00:00+05:30')::timestamptz
  );

  -- Check-in 4: end_day back at HQ (≈ 8.9 km from B)
  INSERT INTO checkins (user_id, lead_id, type, latitude, longitude, distance_from_previous_km, remarks, created_at)
  VALUES (
    v_user_id, v_lead_id, 'end_day',
    12.9716, 77.5946,
    8.9,
    '[SIM] End of day',
    (v_today || ' 17:00:00+05:30')::timestamptz
  );

  RAISE NOTICE 'Simulation rows inserted for user % on %', v_user_id, v_today;
END $$;
