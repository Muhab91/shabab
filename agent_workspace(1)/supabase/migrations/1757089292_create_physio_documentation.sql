-- Migration: create_physio_documentation
-- Created at: 1757089292

-- Tabelle für Physiotherapie-Dokumentationseinträge
CREATE TABLE IF NOT EXISTS physio_documentation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES physio_assessments(id) ON DELETE CASCADE,
    therapist_id UUID REFERENCES profiles(id),
    date DATE NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE physio_documentation ENABLE ROW LEVEL SECURITY;

-- Policies für physio_documentation
CREATE POLICY "physio_documentation_select_policy" ON physio_documentation
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            get_user_role() = 'physiotherapist' OR
            get_user_role() = 'physician'
        )
    );

CREATE POLICY "physio_documentation_insert_policy" ON physio_documentation
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            get_user_role() = 'physiotherapist'
        )
    );

CREATE POLICY "physio_documentation_update_policy" ON physio_documentation
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            (get_user_role() = 'physiotherapist' AND therapist_id = get_user_id())
        )
    );

CREATE POLICY "physio_documentation_delete_policy" ON physio_documentation
    FOR DELETE USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            (get_user_role() = 'physiotherapist' AND therapist_id = get_user_id())
        )
    );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_physio_documentation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER physio_documentation_updated_at
    BEFORE UPDATE ON physio_documentation
    FOR EACH ROW
    EXECUTE FUNCTION update_physio_documentation_updated_at();;