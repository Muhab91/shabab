CREATE TABLE appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    appointment_type VARCHAR(100) NOT NULL,
    player_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(30) DEFAULT 'scheduled',
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);