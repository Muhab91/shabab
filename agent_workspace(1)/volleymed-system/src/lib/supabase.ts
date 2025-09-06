import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types für die Datenbank
export type Profile = {
  id: string
  user_id?: string
  email: string
  full_name: string
  role: 'admin' | 'trainer' | 'physiotherapist' | 'physician'
  team?: string
  position?: string
  date_of_birth?: string
  medical_record_number?: string
  phone?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export type Player = {
  id: string
  first_name: string
  last_name: string
  date_of_birth?: string
  jersey_number?: number
  position?: string
  height?: number
  weight?: number
  emergency_contact?: string
  emergency_phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CMJTest = {
  id: string
  player_id: string
  test_date: string
  jump_height_cm?: number
  flight_time_ms?: number
  ground_contact_time_ms?: number
  balance_left_percent?: number
  balance_right_percent?: number
  peak_force_n?: number
  power_watts?: number
  rsi_score?: number
  notes?: string
  tested_by?: string
  created_at: string
}

export type PhysioAssessment = {
  id: string
  player_id: string
  therapist_id?: string
  date_of_assessment: string
  diagnosis?: string
  secondary_diagnosis?: string
  medications?: string
  recreational_activities?: string
  social_history?: string
  current_occupation?: string
  current_complaints?: string
  complaints_in_daily_life?: string
  complaints_since_when?: string
  frequency_of_complaints?: string
  triggered_by?: string
  relieved_by?: string
  previous_treatments?: string
  previous_therapies?: string
  inspection_findings?: string
  palpation_findings?: string
  pain_intensity?: number
  pain_description?: string
  specific_findings?: string
  therapy_goals?: string
  created_at: string
  updated_at: string
}

export type MedicalTreatment = {
  id: string
  player_id: string
  treatment_date: string
  treating_doctor?: string
  hospital_or_practice?: string
  icd10_code?: string
  diagnosis?: string
  treatment_measures?: string
  therapy_recommendations?: string
  prognosis?: string
  follow_up_date?: string
  treatment_notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// Auth helpers
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting user:', error)
    return null
  }
  return user
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  
  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  
  return data as Profile | null
}
