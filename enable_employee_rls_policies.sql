-- Enable employees with proper permissions to access store data

-- ============================================
-- ORDERS TABLE
-- ============================================

-- Drop existing policy and recreate with employee access
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;

CREATE POLICY "Customers and employees can view orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  auth.uid() = customer_id 
  OR EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = orders.store_id 
    AND stores.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM store_employees 
    WHERE store_employees.store_id = orders.store_id 
    AND store_employees.user_id = auth.uid()
    AND store_employees.is_active = true
    AND (store_employees.permissions->'orders'->>'view')::boolean = true
  )
  OR has_role(auth.uid(), 'admin')
);

-- Update policy for store owners and employees
DROP POLICY IF EXISTS "Store owners can update their store orders" ON public.orders;

CREATE POLICY "Store owners and employees can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = orders.store_id 
    AND stores.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM store_employees 
    WHERE store_employees.store_id = orders.store_id 
    AND store_employees.user_id = auth.uid()
    AND store_employees.is_active = true
    AND (store_employees.permissions->'orders'->>'update')::boolean = true
  )
  OR has_role(auth.uid(), 'admin')
);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view order items of their orders" ON public.order_items;

CREATE POLICY "Users and employees can view order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.customer_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM stores 
        WHERE stores.id = orders.store_id 
        AND stores.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = orders.store_id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'orders'->>'view')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- Add INSERT policy for employees
CREATE POLICY "Store owners and employees can insert order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = order_items.order_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = s.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'orders'->'add_order_items')::boolean = true
      )
    )
  )
);

-- Update DELETE policy for employees
DROP POLICY IF EXISTS "Store owners can delete order items for their store orders" ON public.order_items;

CREATE POLICY "Store owners and employees can delete order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = order_items.order_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = s.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'orders'->'delete_order_items')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- Update UPDATE policy for employees
DROP POLICY IF EXISTS "Store owners can update order items" ON public.order_items;

CREATE POLICY "Store owners and employees can update order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = order_items.order_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = s.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'orders'->'edit_order_details')::boolean = true
      )
    )
  )
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Anyone can view available products" ON public.products;

CREATE POLICY "Anyone can view available products"
ON public.products
FOR SELECT
TO authenticated
USING (
  is_available = true
  OR EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = products.store_id 
    AND stores.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM store_employees 
    WHERE store_employees.store_id = products.store_id 
    AND store_employees.user_id = auth.uid()
    AND store_employees.is_active = true
    AND (store_employees.permissions->'products'->>'view')::boolean = true
  )
  OR has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Store owners can manage their products" ON public.products;

CREATE POLICY "Store owners and employees can manage products"
ON public.products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = products.store_id 
    AND stores.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM store_employees 
    WHERE store_employees.store_id = products.store_id 
    AND store_employees.user_id = auth.uid()
    AND store_employees.is_active = true
    AND (
      (store_employees.permissions->'products'->>'create')::boolean = true
      OR (store_employees.permissions->'products'->>'update')::boolean = true
      OR (store_employees.permissions->'products'->>'delete')::boolean = true
    )
  )
  OR has_role(auth.uid(), 'admin')
);

-- ============================================
-- PRODUCT ADDONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Anyone can view available addons" ON public.product_addons;

CREATE POLICY "Anyone can view available addons"
ON public.product_addons
FOR SELECT
TO authenticated
USING (
  is_available = true
  OR EXISTS (
    SELECT 1 FROM products p
    JOIN stores s ON s.id = p.store_id
    WHERE p.id = product_addons.product_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = s.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'products'->>'view')::boolean = true
      )
    )
  )
  OR has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Store owners can manage their product addons" ON public.product_addons;

CREATE POLICY "Store owners and employees can manage addons"
ON public.product_addons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM products p
    JOIN stores s ON s.id = p.store_id
    WHERE p.id = product_addons.product_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = s.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'products'->>'update')::boolean = true
      )
    )
  )
  OR has_role(auth.uid(), 'admin')
);

-- ============================================
-- PRODUCT FLAVORS TABLE
-- ============================================

DROP POLICY IF EXISTS "Anyone can view available flavors" ON public.product_flavors;

CREATE POLICY "Anyone can view available flavors"
ON public.product_flavors
FOR SELECT
TO authenticated
USING (
  is_available = true
  OR EXISTS (
    SELECT 1 FROM products p
    JOIN stores s ON s.id = p.store_id
    WHERE p.id = product_flavors.product_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = s.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'products'->>'view')::boolean = true
      )
    )
  )
  OR has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Store owners can manage their product flavors" ON public.product_flavors;

CREATE POLICY "Store owners and employees can manage flavors"
ON public.product_flavors
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM products p
    JOIN stores s ON s.id = p.store_id
    WHERE p.id = product_flavors.product_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = s.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'products'->>'update')::boolean = true
      )
    )
  )
  OR has_role(auth.uid(), 'admin')
);

-- ============================================
-- COUPONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Store owners can view their coupons" ON public.coupons;

CREATE POLICY "Store owners and employees can view coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = coupons.store_id 
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = stores.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'coupons'->>'view')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Store owners can insert their coupons" ON public.coupons;

CREATE POLICY "Store owners and employees can insert coupons"
ON public.coupons
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = coupons.store_id 
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = stores.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'coupons'->>'create')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Store owners can update their coupons" ON public.coupons;

CREATE POLICY "Store owners and employees can update coupons"
ON public.coupons
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = coupons.store_id 
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = stores.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'coupons'->>'update')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Store owners can delete their coupons" ON public.coupons;

CREATE POLICY "Store owners and employees can delete coupons"
ON public.coupons
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = coupons.store_id 
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = stores.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'coupons'->>'delete')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- ============================================
-- PRODUCT CATEGORIES TABLE
-- ============================================

DROP POLICY IF EXISTS "Store owners can manage their categories" ON public.product_categories;

CREATE POLICY "Store owners and employees can manage categories"
ON public.product_categories
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = product_categories.store_id 
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = stores.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (
          (store_employees.permissions->'categories'->>'view')::boolean = true
          OR (store_employees.permissions->'categories'->>'create')::boolean = true
          OR (store_employees.permissions->'categories'->>'update')::boolean = true
          OR (store_employees.permissions->'categories'->>'delete')::boolean = true
        )
      )
    )
  )
);

-- ============================================
-- ORDER STATUS CONFIGS TABLE
-- ============================================

DROP POLICY IF EXISTS "Store owners can view their status configs" ON public.order_status_configs;

CREATE POLICY "Store owners and employees can view status configs"
ON public.order_status_configs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = order_status_configs.store_id 
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

DROP POLICY IF EXISTS "Store owners can manage their status configs" ON public.order_status_configs;

CREATE POLICY "Store owners and employees can manage status configs"
ON public.order_status_configs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = order_status_configs.store_id 
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = stores.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'settings'->>'view')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- ============================================
-- STORE INSTANCES TABLE (WhatsApp)
-- ============================================

DROP POLICY IF EXISTS "Store owners can view their instances" ON public.store_instances;

CREATE POLICY "Store owners and employees can view instances"
ON public.store_instances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = store_instances.store_id 
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = stores.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'settings'->'manage_whatsapp')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Store owners can insert their instances" ON public.store_instances;

CREATE POLICY "Store owners and employees can insert instances"
ON public.store_instances
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = store_instances.store_id 
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = stores.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'settings'->'manage_whatsapp')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Store owners can update their instances" ON public.store_instances;

CREATE POLICY "Store owners and employees can update instances"
ON public.store_instances
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = store_instances.store_id 
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = stores.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'settings'->'manage_whatsapp')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Store owners can delete their instances" ON public.store_instances;

CREATE POLICY "Store owners and employees can delete instances"
ON public.store_instances
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = store_instances.store_id 
    AND (
      stores.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = stores.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'settings'->'manage_whatsapp')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

-- ============================================
-- ORDER EDIT HISTORY
-- ============================================

DROP POLICY IF EXISTS "Store owners can view order edit history" ON public.order_edit_history;

CREATE POLICY "Store owners and employees can view edit history"
ON public.order_edit_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = order_edit_history.order_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = s.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'orders'->'view_order_history')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);

DROP POLICY IF EXISTS "Store owners can insert order edit history" ON public.order_edit_history;

CREATE POLICY "Store owners and employees can insert edit history"
ON public.order_edit_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = order_edit_history.order_id
    AND (
      s.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM store_employees 
        WHERE store_employees.store_id = s.id 
        AND store_employees.user_id = auth.uid()
        AND store_employees.is_active = true
        AND (store_employees.permissions->'orders'->'edit_order_details')::boolean = true
      )
      OR has_role(auth.uid(), 'admin')
    )
  )
);
