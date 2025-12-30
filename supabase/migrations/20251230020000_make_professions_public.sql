-- Make professions table publicly readable so clients can see available services
DROP POLICY IF EXISTS "Anyone can read professions" ON professions;
CREATE POLICY "Anyone can read professions"
  ON professions FOR SELECT
  TO public
  USING (true);