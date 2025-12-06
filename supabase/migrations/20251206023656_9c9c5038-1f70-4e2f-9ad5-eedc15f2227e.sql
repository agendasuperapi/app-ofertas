-- Fix infinite recursion in RLS policies for stores table
-- The issue: "Owners, employees, and admins can view stores" policy checks store_employees,
-- which has policies that check stores, causing infinite recursion.

-- Step 1: Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Owners, employees, and admins can view stores" ON public.stores;

-- Step 2: Create or replace the is_store_employee function with SECURITY DEFINER
-- This function bypasses RLS when checking store_employees table
CREATE OR REPLACE FUNCTION public.is_store_employee(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_employees
    WHERE user_id = _user_id
      AND store_id = _store_id
      AND is_active = true
  )
$$;

-- Step 3: Recreate the policy using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Owners, employees, and admins can view stores"
ON public.stores
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() 
  OR is_store_employee(auth.uid(), id)
  OR has_role(auth.uid(), 'admin'::app_role)
);