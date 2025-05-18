/*
  # Update onboarding and layout tables

  1. Changes
    - Add UNIQUE constraint to session_id in onboarding_sessions
    - Add ON DELETE CASCADE to foreign key references
    - Add indexes for better query performance
    - Add RLS policies for anonymous and authenticated users

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for anonymous sessions
*/

-- Add UNIQUE constraint to session_id if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'onboarding_sessions_session_id_key'
  ) THEN
    ALTER TABLE onboarding_sessions 
    ADD CONSTRAINT onboarding_sessions_session_id_key UNIQUE (session_id);
  END IF;
END $$;

-- Update foreign key constraints to add ON DELETE CASCADE
DO $$ 
BEGIN
  -- Drop existing foreign key constraints if they exist
  ALTER TABLE onboarding_steps
  DROP CONSTRAINT IF EXISTS onboarding_steps_session_id_fkey;
  
  ALTER TABLE garden_layouts_history
  DROP CONSTRAINT IF EXISTS garden_layouts_history_session_id_fkey;
  
  -- Add new constraints with ON DELETE CASCADE
  ALTER TABLE onboarding_steps
  ADD CONSTRAINT onboarding_steps_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES onboarding_sessions(id) ON DELETE CASCADE;
  
  ALTER TABLE garden_layouts_history
  ADD CONSTRAINT garden_layouts_history_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES onboarding_sessions(id) ON DELETE CASCADE;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_onboarding_sessions_session_id'
  ) THEN
    CREATE INDEX idx_onboarding_sessions_session_id ON onboarding_sessions(session_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_garden_layouts_history_session_id'
  ) THEN
    CREATE INDEX idx_garden_layouts_history_session_id ON garden_layouts_history(session_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_onboarding_steps_session_id'
  ) THEN
    CREATE INDEX idx_onboarding_steps_session_id ON onboarding_steps(session_id);
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON onboarding_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON onboarding_sessions;
DROP POLICY IF EXISTS "Anonymous sessions are viewable by session_id" ON onboarding_sessions;
DROP POLICY IF EXISTS "Anyone can create anonymous sessions" ON onboarding_sessions;
DROP POLICY IF EXISTS "Users can view steps for their sessions" ON onboarding_steps;
DROP POLICY IF EXISTS "Users can create steps for their sessions" ON onboarding_steps;
DROP POLICY IF EXISTS "Anonymous can view steps by session_id" ON onboarding_steps;
DROP POLICY IF EXISTS "Anyone can create steps for anonymous sessions" ON onboarding_steps;
DROP POLICY IF EXISTS "Users can view their layout history" ON garden_layouts_history;
DROP POLICY IF EXISTS "Users can create layout history" ON garden_layouts_history;
DROP POLICY IF EXISTS "Anonymous can view layouts by session_id" ON garden_layouts_history;
DROP POLICY IF EXISTS "Anyone can create layouts for anonymous sessions" ON garden_layouts_history;

-- Enable RLS
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE garden_layouts_history ENABLE ROW LEVEL SECURITY;

-- Policies for onboarding_sessions
CREATE POLICY "Users can view their own sessions"
  ON onboarding_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create sessions"
  ON onboarding_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anonymous sessions are viewable by session_id"
  ON onboarding_sessions FOR SELECT
  TO public
  USING (session_id IS NOT NULL);

CREATE POLICY "Anyone can create anonymous sessions"
  ON onboarding_sessions FOR INSERT
  TO public
  WITH CHECK (true);

-- Policies for onboarding_steps
CREATE POLICY "Users can view steps for their sessions"
  ON onboarding_steps FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM onboarding_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create steps for their sessions"
  ON onboarding_steps FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id FROM onboarding_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can view steps by session_id"
  ON onboarding_steps FOR SELECT
  TO public
  USING (
    session_id IN (
      SELECT id FROM onboarding_sessions WHERE session_id IS NOT NULL
    )
  );

CREATE POLICY "Anyone can create steps for anonymous sessions"
  ON onboarding_steps FOR INSERT
  TO public
  WITH CHECK (
    session_id IN (
      SELECT id FROM onboarding_sessions WHERE session_id IS NOT NULL
    )
  );

-- Policies for garden_layouts_history
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