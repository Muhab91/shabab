CREATE TABLE medical_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID,
    medical_treatment_id UUID,
    document_type VARCHAR(50),
    document_category VARCHAR(100),
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    description TEXT,
    tags TEXT[],
    is_sensitive BOOLEAN DEFAULT true,
    uploaded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);