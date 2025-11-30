-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- Cria sistema de categorias de variações (sizes) similar ao de adicionais

-- Criar tabela de categorias de variações
CREATE TABLE IF NOT EXISTS public.size_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_exclusive boolean NOT NULL DEFAULT false,
  min_items integer NOT NULL DEFAULT 0,
  max_items integer DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Adicionar category_id e allow_quantity à tabela product_sizes
ALTER TABLE public.product_sizes 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.size_categories(id) ON DELETE SET NULL;

ALTER TABLE public.product_sizes 
ADD COLUMN IF NOT EXISTS allow_quantity boolean DEFAULT false;

-- Índices
CREATE INDEX IF NOT EXISTS idx_size_categories_store_id 
ON public.size_categories(store_id);

CREATE INDEX IF NOT EXISTS idx_product_sizes_category_id 
ON public.product_sizes(category_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_size_categories_updated_at
  BEFORE UPDATE ON public.size_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.size_categories ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver categorias ativas
CREATE POLICY "Anyone can view active size categories"
  ON public.size_categories
  FOR SELECT
  USING (is_active = true);

-- Donos de loja podem gerenciar suas categorias
CREATE POLICY "Store owners can manage size categories"
  ON public.size_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.stores
      WHERE stores.id = size_categories.store_id
      AND (stores.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Adicionar constraints
ALTER TABLE public.size_categories
ADD CONSTRAINT min_items_non_negative CHECK (min_items >= 0);

ALTER TABLE public.size_categories
ADD CONSTRAINT max_items_valid CHECK (
  max_items IS NULL OR 
  (is_exclusive = false AND max_items >= min_items) OR
  (is_exclusive = true AND max_items = 1)
);

-- Comentários nas colunas
COMMENT ON COLUMN public.size_categories.min_items IS 'Minimum number of items that must be selected from this category (0 = optional)';
COMMENT ON COLUMN public.size_categories.max_items IS 'Maximum number of items that can be selected from this category (NULL = unlimited)';
COMMENT ON COLUMN public.size_categories.is_exclusive IS 'When true, only one size can be selected from this category (radio button behavior)';
COMMENT ON COLUMN public.product_sizes.allow_quantity IS 'Allows customers to select multiple quantities of this size';
