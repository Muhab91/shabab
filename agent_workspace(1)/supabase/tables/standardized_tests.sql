CREATE TABLE standardized_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    test_date DATE NOT NULL,
    koos_pain_score INTEGER,
    koos_symptoms_score INTEGER,
    koos_daily_living_score INTEGER,
    koos_sports_score INTEGER,
    koos_quality_of_life_score INTEGER,
    koos_total_score INTEGER,
    other_test_results JSONB,
    interpretation TEXT,
    tested_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);