-- ============================================================
-- Bayar's Coffee CRM — Initial Schema
-- Migration: 001_initial_schema.sql
-- Idempotent: safe to run multiple times
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text        NOT NULL,
  role        text        NOT NULL DEFAULT 'rep'
                          CHECK (role IN ('rep', 'manager')),
  email       text        NOT NULL,
  phone       text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by              uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                  text        NOT NULL DEFAULT 'cold_lead'
                                      CHECK (status IN ('cold_lead', 'hot_lead', 'demo_scheduled', 'customer', 'competitor')),
  cafe_name               text        NOT NULL,
  latitude                double precision,
  longitude               double precision,
  location_address        text,
  poc_name                text,
  poc_contact             text,
  coffee_machine          text,
  current_bean_brand      text,
  bean_usage_kg           numeric,
  bean_price_per_kg       numeric,
  cappuccino_price        numeric,
  menu_image_url          text,
  remarks                 text,
  demo_date               timestamptz,
  quoted_price            numeric,
  quoted_bean_name        text,
  calibration_visit_date  timestamptz,
  visit_notes             text,
  cs_handover_date        timestamptz,
  scheduled_date          timestamptz,
  scheduled_type          text        CHECK (scheduled_type IN ('visit', 'demo', 'workshop')),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checkins (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                   uuid        REFERENCES public.leads(id) ON DELETE SET NULL,
  user_id                   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name                 text        NOT NULL,
  type                      text        NOT NULL
                                        CHECK (type IN ('visit', 'demo', 'workshop', 'start_day', 'end_day')),
  latitude                  double precision,
  longitude                 double precision,
  remarks                   text,
  gate_pass_number          text,
  beans_used                boolean     DEFAULT false,
  bean_brand                text,
  bean_amount_kg            numeric,
  distance_from_previous_km double precision,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS leads_created_by_idx  ON public.leads (created_by);
CREATE INDEX IF NOT EXISTS leads_status_idx      ON public.leads (status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx  ON public.leads (created_at DESC);

CREATE INDEX IF NOT EXISTS checkins_user_id_idx   ON public.checkins (user_id);
CREATE INDEX IF NOT EXISTS checkins_lead_id_idx   ON public.checkins (lead_id);
CREATE INDEX IF NOT EXISTS checkins_created_at_idx ON public.checkins (created_at DESC);
CREATE INDEX IF NOT EXISTS checkins_type_idx       ON public.checkins (type);

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: updated_at auto-update
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS leads_updated_at ON public.leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile on auth.users insert
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'rep')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins  ENABLE ROW LEVEL SECURITY;

-- profiles policies
DROP POLICY IF EXISTS "Users can view own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Managers can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- leads policies
DROP POLICY IF EXISTS "Reps can manage own leads"    ON public.leads;
DROP POLICY IF EXISTS "Managers can manage all leads" ON public.leads;

CREATE POLICY "Reps can manage own leads"
  ON public.leads FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can manage all leads"
  ON public.leads FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- checkins policies
DROP POLICY IF EXISTS "Reps can manage own checkins"    ON public.checkins;
DROP POLICY IF EXISTS "Managers can view all checkins"  ON public.checkins;

CREATE POLICY "Reps can manage own checkins"
  ON public.checkins FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view all checkins"
  ON public.checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- ─────────────────────────────────────────────────────────────
-- STORAGE BUCKET: menus (public, for menu images)
-- ─────────────────────────────────────────────────────────────

-- Create the bucket (idempotent via INSERT … ON CONFLICT)
INSERT INTO storage.buckets (id, name, public)
VALUES ('menus', 'menus', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own path (user_id/*)
DROP POLICY IF EXISTS "Authenticated users can upload own menus" ON storage.objects;
CREATE POLICY "Authenticated users can upload own menus"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'menus'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read of all menu images (bucket is public)
DROP POLICY IF EXISTS "Anyone can read menus" ON storage.objects;
CREATE POLICY "Anyone can read menus"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'menus');
