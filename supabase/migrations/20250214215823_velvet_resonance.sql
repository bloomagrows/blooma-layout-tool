-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'garden_layouts_history' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE garden_layouts_history 
    ADD COLUMN status text 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

    -- Create index for faster status queries
    CREATE INDEX IF NOT EXISTS idx_garden_layouts_history_status 
    ON garden_layouts_history(status);

    -- Update existing rows to set status from layout_data
    UPDATE garden_layouts_history
    SET status = CASE
      WHEN layout_data->>'status' = 'pending' THEN 'pending'
      WHEN layout_data->>'status' = 'processing' THEN 'processing'
      WHEN layout_data->>'status' = 'completed' THEN 'completed'
      WHEN layout_data->>'status' = 'failed' THEN 'failed'
      ELSE 'completed'
    END;

    -- Make status column NOT NULL after populating data
    ALTER TABLE garden_layouts_history 
    ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;