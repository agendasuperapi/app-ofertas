-- Drop the restrictive policy for customers
DROP POLICY IF EXISTS "Customers can validate active coupons" ON coupons;

-- Recreate it as PERMISSIVE so store owners can still see all coupons
-- This policy only applies to non-owners/non-employees who need to validate coupons
CREATE POLICY "Customers can validate active coupons" 
ON coupons 
FOR SELECT 
TO public
USING (
  (is_active = true) 
  AND (valid_from <= now()) 
  AND ((valid_until IS NULL) OR (valid_until >= now()))
);