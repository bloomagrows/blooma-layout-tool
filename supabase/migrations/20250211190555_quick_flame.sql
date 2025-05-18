/*
  # Add notification email support
  
  1. Changes
    - Add notification_email column to onboarding_sessions table
    - Add index on notification_email for faster lookups
  
  2. Notes
    - Column is nullable since email notification is optional
    - Basic email format validation using CHECK constraint
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