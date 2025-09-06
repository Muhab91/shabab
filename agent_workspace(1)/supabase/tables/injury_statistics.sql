CREATE TABLE injury_statistics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID,
    injury_type VARCHAR(100),
    body_region VARCHAR(100),
    severity_level VARCHAR(50),
    injury_date DATE,
    recovery_date DATE,
    days_out INTEGER,
    cause_category VARCHAR(100),
    prevention_measures TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);