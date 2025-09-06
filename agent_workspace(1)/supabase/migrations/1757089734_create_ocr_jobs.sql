-- Migration: create_ocr_jobs
-- Created at: 1757089734

-- Tabelle für OCR-Jobs
CREATE TABLE IF NOT EXISTS ocr_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_path TEXT NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    ocr_status VARCHAR(20) DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
    raw_text TEXT,
    extracted_data JSONB,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    processing_time INTEGER, -- in milliseconds
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS aktivieren
ALTER TABLE ocr_jobs ENABLE ROW LEVEL SECURITY;

-- Policies für ocr_jobs
CREATE POLICY "ocr_jobs_select_policy" ON ocr_jobs
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            get_user_role() = 'physician' OR
            get_user_role() = 'physiotherapist' OR
            get_user_role() = 'trainer'
        )
    );

CREATE POLICY "ocr_jobs_insert_policy" ON ocr_jobs
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            get_user_role() = 'physician' OR
            get_user_role() = 'physiotherapist' OR
            get_user_role() = 'trainer'
        )
    );

CREATE POLICY "ocr_jobs_update_policy" ON ocr_jobs
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            created_by = get_user_id()
        )
    );

CREATE POLICY "ocr_jobs_delete_policy" ON ocr_jobs
    FOR DELETE USING (
        auth.role() = 'authenticated' AND (
            get_user_role() = 'admin' OR 
            created_by = get_user_id()
        )
    );

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_ocr_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ocr_jobs_updated_at
    BEFORE UPDATE ON ocr_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_ocr_jobs_updated_at();;