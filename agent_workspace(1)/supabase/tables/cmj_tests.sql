CREATE TABLE cmj_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL,
    test_date DATE NOT NULL,
    jump_height_cm DECIMAL(5,2),
    flight_time_ms INTEGER,
    ground_contact_time_ms INTEGER,
    balance_left_percent DECIMAL(5,2),
    balance_right_percent DECIMAL(5,2),
    peak_force_n DECIMAL(8,2),
    power_watts DECIMAL(8,2),
    rsi_score DECIMAL(5,2),
    notes TEXT,
    tested_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);