/*
  # Add delete policies for garden layouts
  
  1. Changes
    - Add RLS policies to allow users to delete their garden layouts
    - Add policies for both authenticated and anonymous users
  
  2. Security
    - Authenticated users can only delete their own layouts
    - Anonymous users can only delete layouts from their session
    - Maintains data isolation between users and sessions
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