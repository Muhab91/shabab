-- Migration: enable_rls_policies
-- Created at: 1757087226

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE cmj_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE physio_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE physio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE standardized_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE injury_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own profile, admins can see all
CREATE POLICY "profiles_select_policy" ON profiles FOR SELECT USING (
  id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE USING (
  id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Players: All authenticated users can view, only staff can modify
CREATE POLICY "players_select_policy" ON players FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "players_insert_policy" ON players FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'athletiktrainer', 'physiotherapeut', 'arzt'))
);

CREATE POLICY "players_update_policy" ON players FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'athletiktrainer', 'physiotherapeut', 'arzt'))
);

-- CMJ Tests: Only athletic trainers and admins can access
CREATE POLICY "cmj_tests_policy" ON cmj_tests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'athletiktrainer'))
);

-- Training Programs: Only athletic trainers and admins can access
CREATE POLICY "training_programs_policy" ON training_programs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'athletiktrainer'))
);

-- Performance Assessments: Only athletic trainers and admins can access
CREATE POLICY "performance_assessments_policy" ON performance_assessments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'athletiktrainer'))
);

-- Physio Assessments: Only physiotherapists and admins can access
CREATE POLICY "physio_assessments_policy" ON physio_assessments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'physiotherapeut'))
);

-- Physio Sessions: Only physiotherapists and admins can access
CREATE POLICY "physio_sessions_policy" ON physio_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'physiotherapeut'))
);

-- Standardized Tests: Only physiotherapists and admins can access
CREATE POLICY "standardized_tests_policy" ON standardized_tests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'physiotherapeut'))
);

-- Medical Treatments: Only doctors and admins can access
CREATE POLICY "medical_treatments_policy" ON medical_treatments FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'arzt'))
);

-- Document OCR Results: All staff members can access
CREATE POLICY "document_ocr_results_policy" ON document_ocr_results FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'athletiktrainer', 'physiotherapeut', 'arzt'))
);

-- Injury Statistics: All staff members can view, only admins and doctors can modify
CREATE POLICY "injury_statistics_select_policy" ON injury_statistics FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'athletiktrainer', 'physiotherapeut', 'arzt'))
);

CREATE POLICY "injury_statistics_modify_policy" ON injury_statistics FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'arzt'))
);

-- Performance Metrics: All staff members can view
CREATE POLICY "performance_metrics_policy" ON performance_metrics FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'athletiktrainer', 'physiotherapeut', 'arzt'))
);

-- Appointments: Users can see their own appointments, staff can see all
CREATE POLICY "appointments_select_policy" ON appointments FOR SELECT USING (
  staff_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'athletiktrainer', 'physiotherapeut', 'arzt'))
);

CREATE POLICY "appointments_modify_policy" ON appointments FOR ALL USING (
  staff_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'athletiktrainer', 'physiotherapeut', 'arzt'))
);;