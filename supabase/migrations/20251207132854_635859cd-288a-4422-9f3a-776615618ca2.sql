-- Drop the existing public policy that filters by is_active
DROP POLICY IF EXISTS "Customers can validate active coupons" ON coupons;

-- Recreate it with a check that it's not a store owner/employee
CREATE POLICY "Customers can validate active coupons" 
ON coupons 
FOR SELECT 
USING (
  (is_active = true) 
  AND (valid_from <= now()) 
  AND ((valid_until IS NULL) OR (valid_until >= now()))
  AND NOT EXISTS (
    SELECT 1 FROM stores
    WHERE stores.id = coupons.store_id 
    AND (
      stores.owner_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM store_employees
        WHERE store_employees.store_id = stores.id
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);