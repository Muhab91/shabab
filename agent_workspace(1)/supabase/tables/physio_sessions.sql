CREATE TABLE physio_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    physio_assessment_id UUID NOT NULL,
    session_date DATE NOT NULL,
    session_notes TEXT,
    treatment_performed TEXT,
    patient_response TEXT,
    next_steps TEXT,
    attended BOOLEAN DEFAULT true,
    absence_reason VARCHAR(200),
    therapist_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);