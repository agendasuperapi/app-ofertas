-- Migrate pending addresses from profiles to user_addresses
-- Only for users who have addresses in profiles but not in user_addresses
INSERT INTO user_addresses (user_id, label, cep, city, street, street_number, neighborhood, complement, is_default)
SELECT 
  p.id as user_id,
  'Endereço Principal' as label,
  p.cep,
  p.city,
  p.street,
  p.street_number,
  p.neighborhood,
  p.complement,
  true as is_default
FROM profiles p
WHERE p.cep IS NOT NULL 
  AND p.city IS NOT NULL 
  AND p.street IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_addresses ua WHERE ua.user_id = p.id
  );