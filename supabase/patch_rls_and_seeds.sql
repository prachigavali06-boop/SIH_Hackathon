-- ============================================================
-- LIVESTOCK SENTINEL — Supabase RLS Policies & Seed Migration
-- Execute this script in the Supabase SQL Editor
-- This ensures all application tables allow SELECT, INSERT, and UPDATE
-- under Row Level Security (RLS) and demo users are present.
-- ============================================================

-- ------------------------------------------------------------
-- 1. SEED CORE USERS (Required for foreign key constraints)
-- ------------------------------------------------------------
INSERT INTO users (id, name, role, district, block, village, phone, avatar_initials)
VALUES
  ('u-farmer-01', 'Ramesh Kumar', 'farmer', 'Nashik', 'Niphad', 'Chandori', '+91 9876543210', 'RK'),
  ('u-paravet-01', 'Sunita Patil', 'paravet', 'Nashik', 'Niphad', 'Chandori', '+91 9123456780', 'SP'),
  ('u-vet-01', 'Dr. Anand Deshmukh', 'veterinarian', 'Nashik', 'Niphad', 'Niphad Town', '+91 9001234567', 'AD'),
  ('u-lab-01', 'Priya Sharma', 'lab_tech', 'Nashik', 'Nashik', 'Nashik HQ', '+91 9812345670', 'PS'),
  ('u-gov-01', 'Dr. S.K. Mishra', 'gov_officer', 'Nashik', 'Nashik', 'District Collectorate', '+91 9900112233', 'SM'),
  ('u-admin-01', 'System Administrator', 'admin', 'Nashik', 'Nashik', 'Command Center', '+91 9800112233', 'SA')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  district = EXCLUDED.district,
  block = EXCLUDED.block,
  village = EXCLUDED.village,
  phone = EXCLUDED.phone,
  avatar_initials = EXCLUDED.avatar_initials;

-- ------------------------------------------------------------
-- 2. ENABLE RLS ON ALL TABLES
-- ------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms_or_herds ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbreak_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE vet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisories ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccination_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. DROP EXISTING CONFLICTING POLICIES IF PRESENT
-- ------------------------------------------------------------
DO $$
BEGIN
  -- Users
  DROP POLICY IF EXISTS "Public & Auth Read Users" ON users;
  DROP POLICY IF EXISTS "Public & Auth Insert Users" ON users;
  DROP POLICY IF EXISTS "Public & Auth Update Users" ON users;

  -- Health Cases
  DROP POLICY IF EXISTS "Public & Auth Read Access" ON health_cases;
  DROP POLICY IF EXISTS "Public & Auth Insert Access" ON health_cases;
  DROP POLICY IF EXISTS "Public & Auth Update Access" ON health_cases;

  -- Symptom Reports
  DROP POLICY IF EXISTS "Public & Auth Read Symptoms" ON symptom_reports;
  DROP POLICY IF EXISTS "Public & Auth Insert Symptoms" ON symptom_reports;
  DROP POLICY IF EXISTS "Public & Auth Update Symptoms" ON symptom_reports;

  -- Risk Assessments
  DROP POLICY IF EXISTS "Public & Auth Read Risk" ON risk_assessments;
  DROP POLICY IF EXISTS "Public & Auth Insert Risk" ON risk_assessments;
  DROP POLICY IF EXISTS "Public & Auth Update Risk" ON risk_assessments;

  -- Samples
  DROP POLICY IF EXISTS "Public & Auth Read Samples" ON samples;
  DROP POLICY IF EXISTS "Public & Auth Insert Samples" ON samples;
  DROP POLICY IF EXISTS "Public & Auth Update Samples" ON samples;

  -- Lab Results
  DROP POLICY IF EXISTS "Public & Auth Read Lab Results" ON lab_results;
  DROP POLICY IF EXISTS "Public & Auth Insert Lab Results" ON lab_results;
  DROP POLICY IF EXISTS "Public & Auth Update Lab Results" ON lab_results;

  -- Alerts
  DROP POLICY IF EXISTS "Public & Auth Read Alerts" ON alerts;
  DROP POLICY IF EXISTS "Public & Auth Insert Alerts" ON alerts;
  DROP POLICY IF EXISTS "Public & Auth Update Alerts" ON alerts;

  -- Case Events
  DROP POLICY IF EXISTS "Public & Auth Read Events" ON case_events;
  DROP POLICY IF EXISTS "Public & Auth Insert Events" ON case_events;

  -- Evidence
  DROP POLICY IF EXISTS "Public & Auth Read Evidence" ON evidence;
  DROP POLICY IF EXISTS "Public & Auth Insert Evidence" ON evidence;

  -- Field Visits
  DROP POLICY IF EXISTS "Public & Auth Read Field Visits" ON field_visits;
  DROP POLICY IF EXISTS "Public & Auth Insert Field Visits" ON field_visits;
  DROP POLICY IF EXISTS "Public & Auth Update Field Visits" ON field_visits;

  -- Vaccination Records
  DROP POLICY IF EXISTS "Public & Auth Read Vaccination Records" ON vaccination_records;
  DROP POLICY IF EXISTS "Public & Auth Insert Vaccination Records" ON vaccination_records;

  -- Treatment Records
  DROP POLICY IF EXISTS "Public & Auth Read Treatment Records" ON treatment_records;
  DROP POLICY IF EXISTS "Public & Auth Insert Treatment Records" ON treatment_records;

  -- Vet Assignments
  DROP POLICY IF EXISTS "Public & Auth Read Vet Assignments" ON vet_assignments;
  DROP POLICY IF EXISTS "Public & Auth Insert Vet Assignments" ON vet_assignments;
  DROP POLICY IF EXISTS "Public & Auth Update Vet Assignments" ON vet_assignments;

  -- Vaccination Coverage
  DROP POLICY IF EXISTS "Public & Auth Read Vaccination Coverage" ON vaccination_coverage;
  DROP POLICY IF EXISTS "Public & Auth Insert Vaccination Coverage" ON vaccination_coverage;
  DROP POLICY IF EXISTS "Public & Auth Update Vaccination Coverage" ON vaccination_coverage;

  -- Movement Routes
  DROP POLICY IF EXISTS "Public & Auth Read Movement Routes" ON movement_routes;
  DROP POLICY IF EXISTS "Public & Auth Insert Movement Routes" ON movement_routes;

  -- Audit Events
  DROP POLICY IF EXISTS "Public & Auth Read Audit" ON audit_events;
  DROP POLICY IF EXISTS "Public & Auth Insert Audit" ON audit_events;
END $$;

-- ------------------------------------------------------------
-- 4. CREATE COMPREHENSIVE RLS POLICIES FOR ALL WORKFLOW TABLES
-- ------------------------------------------------------------

-- Users
CREATE POLICY "Public & Auth Read Users" ON users FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public & Auth Update Users" ON users FOR UPDATE USING (true);

-- Health Cases
CREATE POLICY "Public & Auth Read Access" ON health_cases FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Access" ON health_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Public & Auth Update Access" ON health_cases FOR UPDATE USING (true);

-- Symptom Reports
CREATE POLICY "Public & Auth Read Symptoms" ON symptom_reports FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Symptoms" ON symptom_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public & Auth Update Symptoms" ON symptom_reports FOR UPDATE USING (true);

-- Risk Assessments
CREATE POLICY "Public & Auth Read Risk" ON risk_assessments FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Risk" ON risk_assessments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public & Auth Update Risk" ON risk_assessments FOR UPDATE USING (true);

-- Field Visits
CREATE POLICY "Public & Auth Read Field Visits" ON field_visits FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Field Visits" ON field_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Public & Auth Update Field Visits" ON field_visits FOR UPDATE USING (true);

-- Samples
CREATE POLICY "Public & Auth Read Samples" ON samples FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Samples" ON samples FOR INSERT WITH CHECK (true);
CREATE POLICY "Public & Auth Update Samples" ON samples FOR UPDATE USING (true);

-- Lab Results
CREATE POLICY "Public & Auth Read Lab Results" ON lab_results FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Lab Results" ON lab_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Public & Auth Update Lab Results" ON lab_results FOR UPDATE USING (true);

-- Alerts
CREATE POLICY "Public & Auth Read Alerts" ON alerts FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Alerts" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public & Auth Update Alerts" ON alerts FOR UPDATE USING (true);

-- Case Events
CREATE POLICY "Public & Auth Read Events" ON case_events FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Events" ON case_events FOR INSERT WITH CHECK (true);

-- Evidence
CREATE POLICY "Public & Auth Read Evidence" ON evidence FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Evidence" ON evidence FOR INSERT WITH CHECK (true);

-- Vaccination Records
CREATE POLICY "Public & Auth Read Vaccination Records" ON vaccination_records FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Vaccination Records" ON vaccination_records FOR INSERT WITH CHECK (true);

-- Treatment Records
CREATE POLICY "Public & Auth Read Treatment Records" ON treatment_records FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Treatment Records" ON treatment_records FOR INSERT WITH CHECK (true);

-- Vet Assignments
CREATE POLICY "Public & Auth Read Vet Assignments" ON vet_assignments FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Vet Assignments" ON vet_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public & Auth Update Vet Assignments" ON vet_assignments FOR UPDATE USING (true);

-- Vaccination Coverage
CREATE POLICY "Public & Auth Read Vaccination Coverage" ON vaccination_coverage FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Vaccination Coverage" ON vaccination_coverage FOR INSERT WITH CHECK (true);
CREATE POLICY "Public & Auth Update Vaccination Coverage" ON vaccination_coverage FOR UPDATE USING (true);

-- Movement Routes
CREATE POLICY "Public & Auth Read Movement Routes" ON movement_routes FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Movement Routes" ON movement_routes FOR INSERT WITH CHECK (true);

-- Audit Events
CREATE POLICY "Public & Auth Read Audit" ON audit_events FOR SELECT USING (true);
CREATE POLICY "Public & Auth Insert Audit" ON audit_events FOR INSERT WITH CHECK (true);
