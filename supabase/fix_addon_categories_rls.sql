-- Enable RLS on addon_categories table
ALTER TABLE public.addon_categories ENABLE ROW LEVEL SECURITY;

-- Allow public to view active addon categories
CREATE POLICY "Anyone can view active addon categories"
  ON public.addon_categories
  FOR SELECT
  USING (is_active = true);

-- Store owners and employees can manage their categories
CREATE POLICY "Store owners can manage addon categories"
  ON public.addon_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = addon_categories.store_id
      AND (stores.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );
