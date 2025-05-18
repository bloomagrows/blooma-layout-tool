/*
  # Add payment tracking to garden layouts

  1. New Columns
    - `paid` (boolean) - Tracks if the layout has been paid for
    - `payment_session_id` (text) - Stripe payment session ID
    - `paid_at` (timestamptz) - When the payment was completed

  2. Changes
    - Add indexes for payment-related columns
    - Add check constraint to ensure paid_at is set when paid is true
*/

-- Add payment tracking columns
ALTER TABLE garden_layouts_history
ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_session_id text,
ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_garden_layouts_history_paid 
ON garden_layouts_history(paid);

CREATE INDEX IF NOT EXISTS idx_garden_layouts_history_payment_session_id 
ON garden_layouts_history(payment_session_id);

-- Add check constraint for paid_at
ALTER TABLE garden_layouts_history
ADD CONSTRAINT garden_layouts_history_paid_at_check
CHECK (
  (paid = false AND paid_at IS NULL) OR
  (paid = true AND paid_at IS NOT NULL)
);

-- Add function to update paid status
CREATE OR REPLACE FUNCTION update_garden_layout_payment()
RETURNS trigger AS $$
BEGIN
  IF NEW.paid = true AND OLD.paid = false THEN
    NEW.paid_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for paid_at
CREATE TRIGGER garden_layout_payment_trigger
BEFORE UPDATE ON garden_layouts_history
FOR EACH ROW
EXECUTE FUNCTION update_garden_layout_payment();