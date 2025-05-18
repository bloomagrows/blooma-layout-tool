-- Update check constraint for layout_type
ALTER TABLE garden_layouts_history
DROP CONSTRAINT IF EXISTS garden_layouts_history_layout_type_check;

ALTER TABLE garden_layouts_history
ADD CONSTRAINT garden_layouts_history_layout_type_check 
CHECK (layout_type IN ('ai_generated', 'user_modified'));