-- Add column to store the actual instance name used (may differ from default if stale instances exist)
ALTER TABLE store_instances 
ADD COLUMN IF NOT EXISTS instance_name TEXT;

-- Update existing records to use the evolution_instance_id as instance_name
UPDATE store_instances 
SET instance_name = evolution_instance_id 
WHERE instance_name IS NULL;