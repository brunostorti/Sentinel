-- Allow OTP-authenticated employees to see their own participations
CREATE POLICY "participant_self_select" ON survey_participants
  FOR SELECT USING (
    email = (auth.jwt() ->> 'email')
  );

-- Allow OTP-authenticated employees to see surveys they participate in
CREATE POLICY "participant_surveys_select" ON surveys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM survey_participants sp
      WHERE sp.survey_id = surveys.id
        AND sp.email = (auth.jwt() ->> 'email')
    )
  );
