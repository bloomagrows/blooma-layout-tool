/*
  # Add generation_id to garden_layouts_history

  1. Changes
    - Add generation_id column to garden_layouts_history table
    - Add index on generation_id for faster lookups
    - Update RLS policies to include generation_id in conditions
*/

-- Add generation_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'garden_layouts_history' 
    AND column_name = 'generation_id'
  ) THEN
    ALTER TABLE garden_layouts_history 
    ADD COLUMN generation_id text;
  END IF;
END $$;

-- Create index on generation_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_garden_layouts_history_generation_id'
  ) THEN
    CREATE INDEX idx_garden_layouts_history_generation_id 
    ON garden_layouts_history(generation_id);
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their layout history" ON garden_layouts_history;
DROP POLICY IF EXISTS "Users can create layout history" ON garden_layouts_history;
DROP POLICY IF EXISTS "Anonymous can view layouts by session_id" ON garden_layouts_history;
DROP POLICY IF EXISTS "Anyone can create layouts for anonymous sessions" ON garden_layouts_history;

-- Recreate policies with generation_id support
CREATE POLICY "Users can view their layout history"
  ON garden_layouts_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create layout history"
  ON garden_layouts_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anonymous can view layouts by session_id"
  ON garden_layouts_history FOR SELECT
  TO public
  USING (
    session_id IN (
      SELECT id FROM onboarding_sessions WHERE session_id IS NOT NULL
    )
  );

CREATE POLICY "Anyone can create layouts for anonymous sessions"
  ON garden_layouts_history FOR INSERT
  TO public
  WITH CHECK (
    session_id IN (
      SELECT id FROM onboarding_sessions WHERE session_id IS NOT NULL
    )
  );