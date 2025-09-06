CREATE TABLE document_ocr_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scanned_document_id UUID,
    original_file_name VARCHAR(255),
    ocr_text TEXT,
    confidence_score DECIMAL(3,2),
    extracted_fields JSONB,
    validation_status VARCHAR(30) DEFAULT 'pending',
    validation_notes TEXT,
    processed_by UUID,
    reviewed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);