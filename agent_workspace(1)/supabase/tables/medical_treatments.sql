CREATE TABLE medical_treatments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL,
    treatment_date DATE NOT NULL,
    treating_doctor VARCHAR(200),
    hospital_or_practice VARCHAR(200),
    icd10_code VARCHAR(10),
    diagnosis VARCHAR(500),
    treatment_measures TEXT,
    therapy_recommendations TEXT,
    prognosis TEXT,
    follow_up_date DATE,
    treatment_notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);