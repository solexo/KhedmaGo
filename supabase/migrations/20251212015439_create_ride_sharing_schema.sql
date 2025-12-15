/*
  # KhedmaGo - Moroccan Service Marketplace Schema

  1. New Tables
     - `professions`
       - `id` (uuid, primary key)
       - `name_fr` (text)
       - `name_ar` (text)
       - `icon` (text)
       - `created_at` (timestamptz)

     - `professionals`
       - `id` (uuid, primary key, references auth.users)
       - `profession_id` (uuid, references professions)
       - `name` (text)
       - `photo_url` (text)
       - `description_fr` (text)
       - `description_ar` (text)
       - `city` (text)
       - `latitude` (numeric)
       - `longitude` (numeric)
       - `phone` (text)
       - `is_available` (boolean, default true)
       - `created_at` (timestamptz)
       - `updated_at` (timestamptz)

     - `users`
       - `id` (uuid, primary key, references auth.users)
       - `user_type` (text) - 'client' or 'professional'
       - `full_name` (text)
       - `phone` (text)
       - `created_at` (timestamptz)
       - `updated_at` (timestamptz)

   2. Security
     - Enable RLS on all tables
     - Users: Users can read/update their own data
     - Professionals: Public read for available professionals, professionals can update their own
     - Professions: Public read
*/

-- Professions table
CREATE TABLE IF NOT EXISTS professions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_fr text NOT NULL,
  name_ar text NOT NULL,
  icon text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE professions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read professions"
  ON professions FOR SELECT
  TO authenticated
  USING (true);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('client', 'professional')),
  full_name text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Professionals table
CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  profession_id uuid REFERENCES professions(id) NOT NULL,
  name text NOT NULL,
  photo_url text,
  description_fr text,
  description_ar text,
  city text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  phone text NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read available professionals"
  ON professionals FOR SELECT
  TO authenticated
  USING (is_available = true);

CREATE POLICY "Professionals can insert their own profile"
  ON professionals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Professionals can update their own profile"
  ON professionals FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert some sample professions
INSERT INTO professions (name_fr, name_ar, icon) VALUES
  ('Plombier', 'سباك', '🔧'),
  ('Électricien', 'كهربائي', '⚡'),
  ('Mécanicien', 'ميكانيكي', '🔨'),
  ('Menuisier', 'نجار', '🪚'),
  ('Peintre', 'دهان', '🎨'),
  ('Jardinier', 'بستاني', '🌱'),
  ('Cuisinier', 'طباخ', '👨‍🍳'),
  ('Réparateur TV', 'مصلح تلفزيون', '📺'),
  ('Coiffeur', 'حلاق', '✂️'),
  ('Nettoyeur', 'منظف', '🧹')
ON CONFLICT DO NOTHING;

-- Create storage bucket for professional photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-photos', 'professional-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for professional photos
CREATE POLICY "Professionals can upload their own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'professional-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view professional photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'professional-photos');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_professionals_available ON professionals(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_professionals_profession ON professionals(profession_id);
CREATE INDEX IF NOT EXISTS idx_professionals_location ON professionals(latitude, longitude);