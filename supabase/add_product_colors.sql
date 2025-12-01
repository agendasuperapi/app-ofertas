-- Add product colors feature
-- Allows store owners to add colors to products with optional image linking and price adjustments

-- Create product_colors table
CREATE TABLE IF NOT EXISTS public.product_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  hex_code text NOT NULL,
  image_id uuid REFERENCES public.product_images(id) ON DELETE SET NULL,
  price_adjustment numeric NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_hex_code CHECK (hex_code ~ '^#[0-9A-Fa-f]{6}$')
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_product_colors_product_id ON public.product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_display_order ON public.product_colors(product_id, display_order);

-- Create order_item_colors table to save colors in orders
CREATE TABLE IF NOT EXISTS public.order_item_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  color_name text NOT NULL,
  color_hex_code text NOT NULL,
  color_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for order item colors
CREATE INDEX IF NOT EXISTS idx_order_item_colors_order_item_id ON public.order_item_colors(order_item_id);

-- Add has_colors column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS has_colors boolean DEFAULT false;

-- Create index for products with colors
CREATE INDEX IF NOT EXISTS idx_products_has_colors ON public.products(has_colors) WHERE has_colors = true;

-- Add trigger to update updated_at on product_colors
CREATE OR REPLACE FUNCTION public.update_product_colors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_colors_updated_at ON public.product_colors;
CREATE TRIGGER update_product_colors_updated_at
  BEFORE UPDATE ON public.product_colors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_colors_updated_at();

-- Enable RLS on product_colors
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view available colors
CREATE POLICY "Anyone can view available colors"
  ON public.product_colors
  FOR SELECT
  USING (
    is_available = true
    OR EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_colors.product_id
      AND (
        s.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.store_employees
          WHERE store_employees.store_id = s.id
          AND store_employees.user_id = auth.uid()
          AND store_employees.is_active = true
          AND ((store_employees.permissions->'products'->>'view')::boolean = true)
        )
      )
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- RLS Policy: Store owners and employees can manage colors
CREATE POLICY "Store owners and employees can manage colors"
  ON public.product_colors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      JOIN public.stores s ON s.id = p.store_id
      WHERE p.id = product_colors.product_id
      AND (
        s.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.store_employees
          WHERE store_employees.store_id = s.id
          AND store_employees.user_id = auth.uid()
          AND store_employees.is_active = true
          AND ((store_employees.permissions->'products'->>'update')::boolean = true)
        )
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    )
  );

-- Enable RLS on order_item_colors
ALTER TABLE public.order_item_colors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Customers can insert colors when creating order items
CREATE POLICY "Customers can insert colors when creating order items"
  ON public.order_item_colors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_colors.order_item_id
      AND o.customer_id = auth.uid()
    )
  );

-- RLS Policy: Users can view colors of their order items
CREATE POLICY "Users can view colors of their order items"
  ON public.order_item_colors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_colors.order_item_id
      AND (
        o.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.stores s
          WHERE s.id = o.store_id
          AND s.owner_id = auth.uid()
        )
        OR public.has_role(auth.uid(), 'admin'::public.app_role)
      )
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.product_colors IS 'Stores color variations for products';
COMMENT ON COLUMN public.product_colors.name IS 'Display name of the color (e.g., "Vermelho", "Azul Marinho")';
COMMENT ON COLUMN public.product_colors.hex_code IS 'Hexadecimal color code (e.g., "#FF0000")';
COMMENT ON COLUMN public.product_colors.image_id IS 'Optional link to a specific product image for this color';
COMMENT ON COLUMN public.product_colors.price_adjustment IS 'Additional price for this color (can be negative for discounts)';
COMMENT ON COLUMN public.product_colors.display_order IS 'Order in which colors should be displayed';
COMMENT ON COLUMN public.product_colors.is_available IS 'Whether this color is currently available for selection';

COMMENT ON TABLE public.order_item_colors IS 'Stores the color selected for each order item';
COMMENT ON COLUMN public.products.has_colors IS 'Indicates if this product has color variations';
