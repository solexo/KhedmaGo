/*
  # Moroccan Ride Sharing Platform Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `phone` (text)
      - `user_type` (text) - 'rider' or 'driver'
      - `avatar_url` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `drivers`
      - `id` (uuid, primary key, references profiles)
      - `vehicle_type` (text) - 'economy', 'comfort', 'premium'
      - `vehicle_model` (text)
      - `vehicle_plate` (text)
      - `license_number` (text)
      - `rating` (numeric, default 5.0)
      - `total_rides` (integer, default 0)
      - `is_available` (boolean, default false)
      - `created_at` (timestamptz)
    
    - `driver_locations`
      - `id` (uuid, primary key)
      - `driver_id` (uuid, references drivers)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `heading` (numeric, optional)
      - `updated_at` (timestamptz)
    
    - `rides`
      - `id` (uuid, primary key)
      - `rider_id` (uuid, references profiles)
      - `driver_id` (uuid, references drivers, optional)
      - `pickup_lat` (numeric)
      - `pickup_lng` (numeric)
      - `pickup_address` (text)
      - `dropoff_lat` (numeric)
      - `dropoff_lng` (numeric)
      - `dropoff_address` (text)
      - `status` (text) - 'requested', 'accepted', 'in_progress', 'completed', 'cancelled'
      - `vehicle_type` (text)
      - `estimated_price` (numeric)
      - `final_price` (numeric, optional)
      - `estimated_duration` (integer) - in minutes
      - `requested_at` (timestamptz)
      - `accepted_at` (timestamptz, optional)
      - `started_at` (timestamptz, optional)
      - `completed_at` (timestamptz, optional)
      - `rating` (integer, optional) - 1-5
      - `feedback` (text, optional)

  2. Security
    - Enable RLS on all tables
    - Profiles: Users can read all profiles, update only their own
    - Drivers: Users can read all drivers, drivers can update their own info
    - Driver locations: Public read for available drivers, drivers can update their own
    - Rides: Users can read their own rides (as rider or driver), create as rider, update as driver
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('rider', 'driver')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('economy', 'comfort', 'premium')),
  vehicle_model text NOT NULL,
  vehicle_plate text NOT NULL,
  license_number text NOT NULL,
  rating numeric DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
  total_rides integer DEFAULT 0,
  is_available boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read driver info"
  ON drivers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can insert their own info"
  ON drivers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Drivers can update their own info"
  ON drivers FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Driver locations table
CREATE TABLE IF NOT EXISTS driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE UNIQUE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  heading numeric,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read available driver locations"
  ON driver_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_locations.driver_id
      AND drivers.is_available = true
    )
  );

CREATE POLICY "Drivers can insert their location"
  ON driver_locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update their location"
  ON driver_locations FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid REFERENCES profiles(id) NOT NULL,
  driver_id uuid REFERENCES drivers(id),
  pickup_lat numeric NOT NULL,
  pickup_lng numeric NOT NULL,
  pickup_address text NOT NULL,
  dropoff_lat numeric NOT NULL,
  dropoff_lng numeric NOT NULL,
  dropoff_address text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
  vehicle_type text NOT NULL CHECK (vehicle_type IN ('economy', 'comfort', 'premium')),
  estimated_price numeric NOT NULL,
  final_price numeric,
  estimated_duration integer NOT NULL,
  requested_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback text
);

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own rides as rider"
  ON rides FOR SELECT
  TO authenticated
  USING (auth.uid() = rider_id);

CREATE POLICY "Drivers can read their assigned rides"
  ON rides FOR SELECT
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can read available ride requests"
  ON rides FOR SELECT
  TO authenticated
  USING (
    status = 'requested' 
    AND EXISTS (
      SELECT 1 FROM drivers 
      WHERE drivers.id = auth.uid() 
      AND drivers.is_available = true
    )
  );

CREATE POLICY "Riders can create rides"
  ON rides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Riders can update their own rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (auth.uid() = rider_id)
  WITH CHECK (auth.uid() = rider_id);

CREATE POLICY "Drivers can update assigned rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_rider ON rides(rider_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON driver_locations(driver_id);