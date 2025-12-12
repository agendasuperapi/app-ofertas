-- Fix whatsapp permissions for master users
UPDATE store_employees 
SET permissions = jsonb_set(
  permissions, 
  '{whatsapp,view}', 
  'true'::jsonb
)
WHERE employee_email LIKE '%@ofertas.app' 
AND position = 'Master';