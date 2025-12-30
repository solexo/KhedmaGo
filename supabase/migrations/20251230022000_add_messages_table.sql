-- Add Messages Table for Chat Functionality

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_request_id uuid REFERENCES job_requests(id) NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('client', 'professional')),
  sender_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read messages for their job request"
  ON messages FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert messages"
  ON messages FOR INSERT
  TO public
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_job_request ON messages(job_request_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);