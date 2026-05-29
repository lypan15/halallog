-- ============================================================
-- HalalLog — Initial Schema + RLS
-- Apply via: Supabase Dashboard > SQL Editor > Run
--            or: supabase db push
-- ============================================================

-- ── 1. profiles ──────────────────────────────────────────────
-- auth.users는 Supabase 내장 테이블이므로 profiles로 확장
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 신규 가입 시 자동 프로필 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. trips ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  trip_name   TEXT,
  description TEXT,
  destination TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  companion   TEXT,
  styles      TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. day_plans ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS day_plans (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id  UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  date     DATE NOT NULL,
  notes    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. places ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS places (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_plan_id    UUID NOT NULL REFERENCES day_plans(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  category       TEXT,
  icon           TEXT,
  address        TEXT,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  google_place_id TEXT,
  time_start     TEXT,
  time_end       TEXT,
  note_body      TEXT,
  sort_order     INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. essential_info ────────────────────────────────────────
-- flights, stays, transports를 JSONB로 통합 저장
CREATE TABLE IF NOT EXISTS essential_info (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id    UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE UNIQUE,
  flights    JSONB DEFAULT '[]',
  stays      JSONB DEFAULT '[]',
  transports JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. budget_items ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id       UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  subcategory   TEXT,
  amount        NUMERIC(12, 2) NOT NULL,
  currency_code TEXT DEFAULT 'USD',
  date_label    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. scan_results ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL CHECK (status IN ('halal', 'haram', 'doubtful', 'unknown')),
  confidence  NUMERIC(4, 3),
  reasoning   TEXT,
  ingredients TEXT[],
  image_url   TEXT,
  scanned_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 8. checklist_items ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS checklist_items (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id  UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  section  TEXT NOT NULL CHECK (section IN ('essential', 'packing', 'quick')),
  text     TEXT NOT NULL,
  done     BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS — 전 테이블 활성화
-- ============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips           ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE places          ENABLE ROW LEVEL SECURITY;
ALTER TABLE essential_info  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results    ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- ── profiles 정책 (id = auth.uid()) ──────────────────────────
CREATE POLICY "own profile only"
  ON profiles FOR ALL
  USING  (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── trips 정책 ───────────────────────────────────────────────
CREATE POLICY "own trips only"
  ON trips FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── day_plans 정책 ───────────────────────────────────────────
CREATE POLICY "own plans only"
  ON day_plans FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── places 정책 ──────────────────────────────────────────────
CREATE POLICY "own places only"
  ON places FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── essential_info 정책 ──────────────────────────────────────
CREATE POLICY "own essential info only"
  ON essential_info FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── budget_items 정책 ────────────────────────────────────────
CREATE POLICY "own budget only"
  ON budget_items FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── scan_results 정책 ────────────────────────────────────────
CREATE POLICY "own scans only"
  ON scan_results FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── checklist_items 정책 ─────────────────────────────────────
CREATE POLICY "own checklist only"
  ON checklist_items FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 인덱스 (성능)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trips_user_id          ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_day_plans_trip_id      ON day_plans(trip_id);
CREATE INDEX IF NOT EXISTS idx_places_day_plan_id     ON places(day_plan_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_trip_id   ON budget_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_checklist_trip_id      ON checklist_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_user_id   ON scan_results(user_id);
