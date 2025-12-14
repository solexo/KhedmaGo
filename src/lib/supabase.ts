import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key present:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  user_type: 'rider' | 'driver';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

export type Driver = {
  id: string;
  vehicle_type: 'economy' | 'comfort' | 'premium';
  vehicle_model: string;
  vehicle_plate: string;
  license_number: string;
  rating: number;
  total_rides: number;
  is_available: boolean;
  created_at: string;
};

export type DriverLocation = {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  heading?: number;
  updated_at: string;
};

export type Ride = {
  id: string;
  rider_id: string;
  driver_id?: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  dropoff_address: string;
  status: 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  vehicle_type: 'economy' | 'comfort' | 'premium';
  estimated_price: number;
  final_price?: number;
  estimated_duration: number;
  requested_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  rating?: number;
  feedback?: string;
};
