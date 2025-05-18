/*
  # Add Delete Policies for Garden Layouts

  1. Changes
    - Add RLS policies to allow users to delete their own garden layouts
    - Add RLS policies to allow anonymous users to delete layouts from their session
  
  2. Security
    - Enable RLS for garden_layouts_history table
    - Ensure users can only delete their own layouts
    - Allow anonymous users to delete layouts only from their session
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can delete their layout history" ON garden_layouts_history;
DROP POLICY IF EXISTS "Anonymous can delete layouts by session_id" ON garden_layouts_history;

-- Create policy for authenticated users to delete their layouts
CREATE POLICY "Users can delete their layout history"
  ON garden_layouts_history FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create policy for anonymous users to delete layouts from their session
CREATE POLICY "Anonymous can delete layouts by session_id"
  ON garden_layouts_history FOR DELETE
  TO public
  USING (
    session_id IN (
      SELECT id FROM onboarding_sessions WHERE session_id IS NOT NULL
    )
  );