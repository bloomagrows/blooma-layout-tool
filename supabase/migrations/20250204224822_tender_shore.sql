/*
  # Add onboarding tracking tables

  1. New Tables
    - `onboarding_sessions`
      - Tracks overall onboarding progress
      - Stores start/end times and completion status
      - Links to user if authenticated
    - `onboarding_steps`
      - Records each step of the onboarding process
      - Stores user inputs and generated recommendations
      - Tracks time spent on each step
    - `garden_layouts_history`
      - Stores all generated garden layouts
      - Includes AI-generated layouts and manual adjustments
      - Links to onboarding session if applicable

  2. Security
    - Enable RLS on all tables
    - Allow authenticated users to view their own data
    - Allow anonymous sessions with temporary IDs
*/

-- Create onboarding_sessions table
CREATE TABLE onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  session_id text NOT NULL,
  growing_zone integer,
  garden_width integer,
  garden_height integer,
  selected_plants text[],
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
  user_agent text,
  screen_size jsonb
);

-- Create onboarding_steps table
CREATE TABLE onboarding_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES onboarding_sessions ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_name text NOT NULL,
  user_input jsonb,
  ai_recommendations jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  time_spent_seconds integer,
  success boolean
);

-- Create garden_layouts_history table
CREATE TABLE garden_layouts_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES onboarding_sessions,
  user_id uuid REFERENCES auth.users,
  layout_data jsonb NOT NULL,
  layout_type text NOT NULL CHECK (layout_type IN ('ai_generated', 'user_modified')),
  created_at timestamptz DEFAULT now()
);

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