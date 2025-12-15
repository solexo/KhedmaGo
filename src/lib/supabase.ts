import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key present:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type User = {
  id: string;
  user_type: 'client' | 'professional';
  full_name: string;
  phone: string;
  created_at: string;
  updated_at: string;
};

export type Profession = {
  id: string;
  name_fr: string;
  name_ar: string;
  icon: string;
  created_at: string;
};

export type Professional = {
  id: string;
  profession_id: string;
  name: string;
  photo_url?: string;
  description_fr?: string;
  description_ar?: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  profession?: Profession;
};
