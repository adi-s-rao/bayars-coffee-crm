-- ============================================================
-- 002_business_logic.sql
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ------------------------------------------------------------
-- 1. DROP removed columns from leads
-- ------------------------------------------------------------
ALTER TABLE leads
  DROP COLUMN IF EXISTS menu_image_url,
  DROP COLUMN IF EXISTS demo_date,
  DROP COLUMN IF EXISTS quoted_price,
  DROP COLUMN IF EXISTS quoted_bean_name,
  DROP COLUMN IF EXISTS calibration_visit_date,
  DROP COLUMN IF EXISTS visit_notes,
  DROP COLUMN IF EXISTS cs_handover_date,
  DROP COLUMN IF EXISTS bean_price_per_kg,
  DROP COLUMN IF EXISTS scheduled_date,
  DROP COLUMN IF EXISTS scheduled_type;

-- ------------------------------------------------------------
-- 2. Update leads.status CHECK constraint
--    Migrate demo_scheduled → hot_lead first, then drop the value
-- ------------------------------------------------------------
UPDATE leads SET status = 'hot_lead' WHERE status = 'demo_scheduled';

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('cold_lead','hot_lead','customer','competitor'));

-- ------------------------------------------------------------
-- 3. Add sample columns to leads
-- ------------------------------------------------------------
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS sample_name text,
  ADD COLUMN IF NOT EXISTS sample_quantity_grams integer;

-- ------------------------------------------------------------
-- 4. Add new_lead to checkins type check
-- ------------------------------------------------------------
ALTER TABLE checkins DROP CONSTRAINT IF EXISTS checkins_type_check;
ALTER TABLE checkins ADD CONSTRAINT checkins_type_check
  CHECK (type IN ('visit','demo','workshop','start_day','end_day','new_lead'));

-- ------------------------------------------------------------
-- 5. CREATE scheduled_visits table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_visits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_date  date NOT NULL,
  visit_type      text NOT NULL CHECK (visit_type IN ('visit','demo','workshop')),
  notes           text,
  completed       boolean NOT NULL DEFAULT false,
  created_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE scheduled_visits ENABLE ROW LEVEL SECURITY;

-- Managers see all; reps see rows assigned to them
CREATE POLICY "scheduled_visits_select" ON scheduled_visits
  FOR SELECT USING (
    auth.uid() = assigned_to
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "scheduled_visits_insert" ON scheduled_visits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "scheduled_visits_update" ON scheduled_visits
  FOR UPDATE USING (
    auth.uid() = assigned_to
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "scheduled_visits_delete" ON scheduled_visits
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_scheduled_visits_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_scheduled_visits_updated_at
  BEFORE UPDATE ON scheduled_visits
  FOR EACH ROW EXECUTE FUNCTION update_scheduled_visits_updated_at();

-- ------------------------------------------------------------
-- 6. CREATE conversions table
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  converted_by          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  beans_ordered_kg      numeric(8,2),
  bean_type             text,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversions_select" ON conversions
  FOR SELECT USING (
    auth.uid() = converted_by
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'
    )
  );

CREATE POLICY "conversions_insert" ON conversions
  FOR INSERT WITH CHECK (auth.uid() = converted_by);

-- ------------------------------------------------------------
-- 7. Indexes
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_scheduled_visits_assigned_to  ON scheduled_visits(assigned_to);
CREATE INDEX IF NOT EXISTS idx_scheduled_visits_lead_id       ON scheduled_visits(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_visits_scheduled_date ON scheduled_visits(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_conversions_lead_id            ON conversions(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversions_converted_by       ON conversions(converted_by);
CREATE INDEX IF NOT EXISTS idx_leads_sample_name              ON leads(sample_name) WHERE sample_name IS NOT NULL;
