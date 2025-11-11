-- Adicionar coluna notes na tabela orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text;