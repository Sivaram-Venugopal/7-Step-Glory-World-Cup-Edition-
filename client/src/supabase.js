import { createClient } from '@supabase/supabase-js';

// Load variables from Vite environment (.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Safely fall back if not defined to allow Guest mode without crashing
const isValidConfig = supabaseUrl && supabaseUrl !== 'https://your-project-id.supabase.co';

export const supabase = isValidConfig 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const isSupabaseConfigured = isValidConfig;
