CREATE TABLE performance_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL,
    assessment_date DATE NOT NULL,
    assessment_type VARCHAR(100) NOT NULL,
    results JSONB,
    risk_score DECIMAL(3,1),
    recommendations TEXT,
    follow_up_date DATE,
    assessed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);