-- Allow public creation of job requests so clients can create requests without authentication
DROP POLICY IF EXISTS "Anyone can create job requests" ON job_requests;
CREATE POLICY "Anyone can create job requests"
  ON job_requests FOR INSERT
  TO public
  WITH CHECK (true);