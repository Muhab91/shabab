CREATE TABLE training_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL,
    program_name VARCHAR(200) NOT NULL,
    program_type VARCHAR(50),
    start_date DATE,
    end_date DATE,
    goals TEXT,
    exercises JSONB,
    weekly_schedule JSONB,
    progress_notes TEXT,
    status VARCHAR(30) DEFAULT 'active',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);