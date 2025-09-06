-- Migration: create_medical_documents
-- Created at: 1757089546

-- Tabelle für medizinische Dokumente
CREATE TABLE IF NOT EXISTS medical_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    treatment_id UUID REFERENCES medical_treatments(id) ON DELETE SET NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('radiology', 'lab_results', 'referral', 'discharge_summary', 'therapy_plan', 'other')),
    document_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    upload_date DATE NOT NULL,
    uploaded_by UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;

-- Policies für medical_documents
CREATE POLICY "medical_documents_select_policy" ON medical_documents
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            get_user_role() = 'physician' OR
            get_user_role() = 'physiotherapist'
        )
    );

CREATE POLICY "medical_documents_insert_policy" ON medical_documents
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            get_user_role() = 'physician'
        )
    );

CREATE POLICY "medical_documents_update_policy" ON medical_documents
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            (get_user_role() = 'physician' AND uploaded_by = get_user_id())
        )
    );

CREATE POLICY "medical_documents_delete_policy" ON medical_documents
    FOR DELETE USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            (get_user_role() = 'physician' AND uploaded_by = get_user_id())
        )
    );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_medical_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER medical_documents_updated_at
    BEFORE UPDATE ON medical_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_medical_documents_updated_at();;