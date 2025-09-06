CREATE TABLE performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2),
    metric_unit VARCHAR(50),
    measurement_date DATE NOT NULL,
    player_id UUID,
    department VARCHAR(50),
    notes TEXT,
    recorded_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);