-- Migration: create_helper_functions
-- Created at: 1757089300

-- Helper-Funktion für Benutzer-ID
CREATE OR REPLACE FUNCTION get_user_id() 
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper-Funktion für Benutzer-Rolle
CREATE OR REPLACE FUNCTION get_user_role() 
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM profiles 
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role, 'unknown');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;