-- Migration: create_performance_assessments
-- Created at: 1757089430

-- Tabelle für Performance-Assessments
CREATE TABLE IF NOT EXISTS performance_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL,
    risk_score INTEGER CHECK (risk_score >= 1 AND risk_score <= 10),
    fatigue_level INTEGER CHECK (fatigue_level >= 1 AND fatigue_level <= 10),
    readiness_score INTEGER CHECK (readiness_score >= 1 AND readiness_score <= 10),
    strength_assessment TEXT,
    mobility_assessment TEXT,
    recommendations TEXT,
    return_to_play_status VARCHAR(20) DEFAULT 'cleared' CHECK (return_to_play_status IN ('cleared', 'restricted', 'modified', 'not_cleared')),
    assessed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE performance_assessments ENABLE ROW LEVEL SECURITY;

-- Policies für performance_assessments
CREATE POLICY "performance_assessments_select_policy" ON performance_assessments
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            get_user_role() = 'trainer' OR
            get_user_role() = 'physician'
        )
    );

CREATE POLICY "performance_assessments_insert_policy" ON performance_assessments
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            get_user_role() = 'trainer'
        )
    );

CREATE POLICY "performance_assessments_update_policy" ON performance_assessments
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            (get_user_role() = 'trainer' AND assessed_by = get_user_id())
        )
    );

CREATE POLICY "performance_assessments_delete_policy" ON performance_assessments
    FOR DELETE USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            (get_user_role() = 'trainer' AND assessed_by = get_user_id())
        )
    );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_performance_assessments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER performance_assessments_updated_at
    BEFORE UPDATE ON performance_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_assessments_updated_at();;