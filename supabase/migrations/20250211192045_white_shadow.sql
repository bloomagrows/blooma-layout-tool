/*
  # Add notification email support
  
  1. Changes
    - Add notification_email column to onboarding_sessions
    - Add email validation check constraint
    - Create index for faster lookups
    - Update RLS policies to allow updating notification_email
  
  2. Security
    - Email format validation via check constraint
    - RLS policies to control access
*/

-- Add notification_email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'onboarding_sessions' 
    AND column_name = 'notification_email'
  ) THEN
    ALTER TABLE onboarding_sessions 
    ADD COLUMN notification_email text 
    CHECK (
      notification_email IS NULL OR 
      notification_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    );

    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_notification_email 
    ON onboarding_sessions(notification_email);
  END IF;
END $$;

-- Drop existing update policies if they exist
DROP POLICY IF EXISTS "Users can update their sessions" ON onboarding_sessions;
DROP POLICY IF EXISTS "Anonymous can update sessions by session_id" ON onboarding_sessions;

-- Create policy for authenticated users to update their sessions
CREATE POLICY "Users can update their sessions"
  ON onboarding_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create policy for anonymous users to update sessions by session_id
CREATE POLICY "Anonymous can update sessions by session_id"
  ON onboarding_sessions FOR UPDATE
  TO public
  USING (session_id IS NOT NULL)
  WITH CHECK (session_id IS NOT NULL);