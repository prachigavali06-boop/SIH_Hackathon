-- ============================================================
-- LIVESTOCK SENTINEL — Supabase PostgreSQL Schema Migration
-- Member 1 — Backend & Foundation Layer DDL Script
-- Pre-Merge Safety Compliant: Triage & Risk Scoring Only
-- Canonical Case ID format: LV-YYYY-XXXXX
-- ============================================================

-- Enable PostGIS if available (optional for geospatial)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- ------------------------------------------------------------
-- 1. USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN (
    'farmer', 'field_worker', 'paravet', 'veterinarian',
    'laboratory', 'lab_tech', 'government_officer', 'gov_officer', 'admin'
  )),
  district VARCHAR(128) NOT NULL,
  block VARCHAR(128),
  village VARCHAR(128),
  phone VARCHAR(32),
  email VARCHAR(255) UNIQUE,
  avatar_initials VARCHAR(4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. FARMS OR HERDS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farms_or_herds (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  owner_farmer_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  farm_name VARCHAR(255),
  village VARCHAR(128) NOT NULL,
  block VARCHAR(128) NOT NULL,
  district VARCHAR(128) NOT NULL,
  state VARCHAR(128) NOT NULL DEFAULT 'Maharashtra',
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  total_animal_count INT NOT NULL DEFAULT 0,
  species_counts JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. ANIMALS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS animals (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  farm_id VARCHAR(64) REFERENCES farms_or_herds(id) ON DELETE CASCADE,
  species VARCHAR(32) NOT NULL,
  breed VARCHAR(128),
  tag_number VARCHAR(64),
  age_months INT,
  gender VARCHAR(16) CHECK (gender IN ('male', 'female')),
  health_status VARCHAR(32) NOT NULL DEFAULT 'healthy' CHECK (health_status IN (
    'healthy', 'suspected', 'diseased', 'quarantined', 'deceased'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. HEALTH CASES (Master Table with Canonical Case ID LV-YYYY-XXXXX)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS health_cases (
  id VARCHAR(64) PRIMARY KEY, -- e.g. LV-2026-00001
  farm_id VARCHAR(64) REFERENCES farms_or_herds(id) ON DELETE SET NULL,
  reported_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE RESTRICT,
  reporter_role VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'reported' CHECK (status IN (
    'reported', 'triaged', 'vet_assigned', 'vet_assessed',
    'sample_collected', 'sample_dispatched', 'sample_received',
    'lab_processing', 'result_pending', 'result_negative',
    'result_positive', 'confirmed', 'contained', 'closed'
  )),
  risk_band VARCHAR(16) NOT NULL DEFAULT 'low' CHECK (risk_band IN ('low', 'moderate', 'high', 'critical')),
  primary_species VARCHAR(32) NOT NULL,
  total_animals_in_herd INT NOT NULL DEFAULT 1,
  affected_animal_count INT NOT NULL DEFAULT 1,
  dead_animal_count INT NOT NULL DEFAULT 0,
  village VARCHAR(128) NOT NULL,
  block VARCHAR(128) NOT NULL,
  district VARCHAR(128) NOT NULL,
  state VARCHAR(128) NOT NULL DEFAULT 'Maharashtra',
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  syndrome_category VARCHAR(128),
  suspected_disease VARCHAR(64),
  confirmed_disease VARCHAR(64), -- DEFINITIVE: Populated ONLY by Vet/Lab workflow
  assigned_vet_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  assigned_lab_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 5. SYMPTOM REPORTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS symptom_reports (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  case_id VARCHAR(64) NOT NULL REFERENCES health_cases(id) ON DELETE CASCADE,
  symptom_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  onset_date DATE NOT NULL,
  duration_days INT NOT NULL DEFAULT 1,
  additional_notes TEXT,
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. VACCINATION RECORDS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vaccination_records (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  farm_id VARCHAR(64) REFERENCES farms_or_herds(id) ON DELETE CASCADE,
  case_id VARCHAR(64) REFERENCES health_cases(id) ON DELETE SET NULL,
  species VARCHAR(32) NOT NULL,
  vaccine_name VARCHAR(255) NOT NULL,
  batch_number VARCHAR(64),
  administered_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  administered_at TIMESTAMPTZ DEFAULT NOW(),
  next_due_date DATE
);

-- ------------------------------------------------------------
-- 7. TREATMENT RECORDS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS treatment_records (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  case_id VARCHAR(64) NOT NULL REFERENCES health_cases(id) ON DELETE CASCADE,
  prescribed_by_vet_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(128),
  instructions TEXT,
  administered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 8. RISK ASSESSMENTS (AI / Automated Triage Output)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_assessments (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  case_id VARCHAR(64) NOT NULL REFERENCES health_cases(id) ON DELETE CASCADE,
  risk_score INT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_band VARCHAR(16) NOT NULL CHECK (risk_band IN ('low', 'moderate', 'high', 'critical')),
  syndrome_category VARCHAR(128),
  suspected_disease VARCHAR(64),
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendation TEXT NOT NULL,
  requires_veterinary_assessment BOOLEAN NOT NULL DEFAULT TRUE,
  disclaimer TEXT NOT NULL,
  model_version VARCHAR(64) NOT NULL DEFAULT 'sentinel-triage-v1',
  is_synthetic BOOLEAN DEFAULT TRUE,
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 9. OUTBREAK CLUSTERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS outbreak_clusters (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cluster_name VARCHAR(255) NOT NULL,
  center_latitude NUMERIC(9,6) NOT NULL,
  center_longitude NUMERIC(9,6) NOT NULL,
  radius_meters INT NOT NULL DEFAULT 3000,
  case_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_disease VARCHAR(64) NOT NULL,
  affected_district VARCHAR(128) NOT NULL,
  affected_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_level VARCHAR(16) NOT NULL CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
  active_case_count INT NOT NULL DEFAULT 1,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'monitoring', 'contained', 'resolved'))
);

-- ------------------------------------------------------------
-- 10. VET ASSIGNMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vet_assignments (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  case_id VARCHAR(64) NOT NULL REFERENCES health_cases(id) ON DELETE CASCADE,
  assigned_vet_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'reassigned')),
  notes TEXT
);

-- ------------------------------------------------------------
-- 11. FIELD VISITS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_visits (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  case_id VARCHAR(64) NOT NULL REFERENCES health_cases(id) ON DELETE CASCADE,
  visited_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  visitor_role VARCHAR(32) NOT NULL,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  clinical_observations TEXT NOT NULL,
  temperature_celsius NUMERIC(4,1),
  agreed_with_ai_risk BOOLEAN NOT NULL DEFAULT TRUE,
  revised_risk_band VARCHAR(16) CHECK (revised_risk_band IN ('low', 'moderate', 'high', 'critical')),
  clinical_diagnosis VARCHAR(64),
  quarantine_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  sample_required BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT
);

-- ------------------------------------------------------------
-- 12. SAMPLES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS samples (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  case_id VARCHAR(64) NOT NULL REFERENCES health_cases(id) ON DELETE CASCADE,
  barcode VARCHAR(64) UNIQUE NOT NULL,
  sample_type VARCHAR(128) NOT NULL,
  collected_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  animal_count_sampled INT NOT NULL DEFAULT 1,
  destination_lab_name VARCHAR(255) NOT NULL,
  dispatchedAt TIMESTAMPTZ,
  receivedAt TIMESTAMPTZ,
  chain_of_custody JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- ------------------------------------------------------------
-- 13. LAB RESULTS (DEFINITIVE Diagnostic Outcome)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_results (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sample_id VARCHAR(64) NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
  case_id VARCHAR(64) NOT NULL REFERENCES health_cases(id) ON DELETE CASCADE,
  lab_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  test_name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL CHECK (status IN ('pending', 'processing', 'positive', 'negative', 'inconclusive')),
  pathogen_confirmed VARCHAR(128),
  serotype VARCHAR(64),
  confirmed_disease VARCHAR(64),
  ct_value NUMERIC(5,2),
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 14. ALERTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  case_id VARCHAR(64) REFERENCES health_cases(id) ON DELETE SET NULL,
  severity VARCHAR(16) NOT NULL CHECK (severity IN ('info', 'warning', 'danger', 'success', 'critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  target_roles JSONB DEFAULT '[]'::jsonb,
  target_district VARCHAR(128),
  is_read BOOLEAN DEFAULT FALSE,
  action_path VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 15. ADVISORIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advisories (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  disease_target VARCHAR(64),
  target_species JSONB DEFAULT '[]'::jsonb,
  target_districts JSONB DEFAULT '[]'::jsonb,
  issued_by_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  effective_until DATE,
  is_public BOOLEAN DEFAULT TRUE
);

-- ------------------------------------------------------------
-- 16. RESPONSE ACTIONS (Containment Actions)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS response_actions (
  id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  case_id VARCHAR(64) NOT NULL REFERENCES health_cases(id) ON DELETE CASCADE,
  cluster_id VARCHAR(64) REFERENCES outbreak_clusters(id) ON DELETE SET NULL,
  type VARCHAR(64) NOT NULL CHECK (type IN (
    'vaccination_drive', 'movement_restriction', 'quarantine',
    'culling', 'awareness', 'surveillance'
  )),
  ordered_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  description TEXT NOT NULL,
  affected_villages JSONB DEFAULT '[]'::jsonb,
  target_animal_count INT
);

-- ------------------------------------------------------------
-- INDEXES FOR PERFORMANCE & SPATIAL SEARCH
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_health_cases_district ON health_cases(district);
CREATE INDEX IF NOT EXISTS idx_health_cases_status ON health_cases(status);
CREATE INDEX IF NOT EXISTS idx_health_cases_risk_band ON health_cases(risk_band);
CREATE INDEX IF NOT EXISTS idx_health_cases_lat_lng ON health_cases(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_samples_barcode ON samples(barcode);
CREATE INDEX IF NOT EXISTS idx_samples_case_id ON samples(case_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_case_id ON lab_results(case_id);

CREATE INDEX IF NOT EXISTS idx_alerts_target_district ON alerts(target_district);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users or public demo
CREATE POLICY "Public & Auth Read Access" ON health_cases FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Access" ON health_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Public & Auth Read Risk" ON risk_assessments FOR SELECT USING (true);
CREATE POLICY "Public & Auth Read Samples" ON samples FOR SELECT USING (true);
CREATE POLICY "Public & Auth Read Alerts" ON alerts FOR SELECT USING (true);
