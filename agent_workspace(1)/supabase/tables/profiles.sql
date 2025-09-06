CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email VARCHAR(255),
    full_name VARCHAR(255),
    role VARCHAR(50) CHECK (role IN ('admin',
    'athletiktrainer',
    'physiotherapeut',
    'arzt')),
    phone VARCHAR(20),
    department VARCHAR(100),
    license_number VARCHAR(100),
    specialization VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);