/*
  # Add Garden Layout Generation Tracking

  1. New Tables
    - `garden_layout_generations`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references onboarding_sessions)
      - `generation_id` (text, unique)
      - `status` (text: 'pending' | 'processing' | 'completed' | 'failed')
      - `error` (text, nullable)
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on `garden_layout_generations` table
    - Add policies for authenticated and anonymous users
*/

-- Create garden_layout_generations table
CREATE TABLE IF NOT EXISTS garden_layout_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES onboarding_sessions ON DELETE CASCADE,
  generation_id text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE garden_layout_generations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_garden_layout_generations_generation_id 
ON garden_layout_generations(generation_id);

CREATE INDEX IF NOT EXISTS idx_garden_layout_generations_session_id 
ON garden_layout_generations(session_id);

-- Policies for garden_layout_generations
CREATE POLICY "Users can view their own generations"
  ON garden_layout_generations FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM onboarding_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create generations"
  ON garden_layout_generations FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id FROM onboarding_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Anonymous can view generations by session_id"
  ON garden_layout_generations FOR SELECT
  TO public
  USING (
    session_id IN (
      SELECT id FROM onboarding_sessions WHERE session_id IS NOT NULL
    )
  );

CREATE POLICY "Anyone can create generations for anonymous sessions"
  ON garden_layout_generations FOR INSERT
  TO public
  WITH CHECK (
    session_id IN (
      SELECT id FROM onboarding_sessions WHERE session_id IS NOT NULL
    )
  );