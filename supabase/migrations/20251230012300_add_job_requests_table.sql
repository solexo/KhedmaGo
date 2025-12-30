/*
  # Add Job Requests Table for KhedmaGo

  - `job_requests`
    - `id` (uuid, primary key)
    - `client_name` (text)
    - `client_phone` (text, optional)
    - `profession_id` (uuid, references professions)
    - `latitude` (numeric)
    - `longitude` (numeric)
    - `status` (text) - 'pending', 'accepted', 'completed', 'cancelled'
    - `accepted_by` (uuid, references professionals, nullable)
    - `accepted_at` (timestamptz, nullable)
    - `completed_at` (timestamptz, nullable)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
*/

-- Job requests table
CREATE TABLE IF NOT EXISTS job_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_phone text,
  profession_id uuid REFERENCES professions(id) NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'negotiating', 'accepted', 'in_progress', 'completed', 'cancelled')),
  accepted_by uuid REFERENCES professionals(id),
  accepted_at timestamptz,
  client_accepted_at timestamptz,
  worker_accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE job_requests ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
   -- Anyone can create job requests (clients)
   IF NOT EXISTS (
     SELECT 1 FROM pg_policies
     WHERE tablename = 'job_requests' AND policyname = 'Anyone can create job requests'
   ) THEN
     CREATE POLICY "Anyone can create job requests"
       ON job_requests FOR INSERT
       TO public
       WITH CHECK (true);
   END IF;

  -- Authenticated users can read job requests (for matching)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'job_requests' AND policyname = 'Authenticated users can read job requests'
  ) THEN
    CREATE POLICY "Authenticated users can read job requests"
      ON job_requests FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Professionals can update their accepted requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'job_requests' AND policyname = 'Professionals can update their accepted requests'
  ) THEN
    CREATE POLICY "Professionals can update their accepted requests"
      ON job_requests FOR UPDATE
      TO authenticated
      USING (accepted_by = auth.uid())
      WITH CHECK (accepted_by = auth.uid());
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON job_requests(status);
CREATE INDEX IF NOT EXISTS idx_job_requests_profession ON job_requests(profession_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_location ON job_requests(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_job_requests_accepted_by ON job_requests(accepted_by);