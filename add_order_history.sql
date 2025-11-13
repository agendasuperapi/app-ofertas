-- Criar tabela de histórico de edições de pedidos
CREATE TABLE IF NOT EXISTS order_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES auth.users(id),
  editor_name TEXT NOT NULL,
  changes JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para buscar histórico por pedido
CREATE INDEX IF NOT EXISTS idx_order_edit_history_order_id 
ON order_edit_history(order_id);

-- Criar índice para buscar histórico por data
CREATE INDEX IF NOT EXISTS idx_order_edit_history_created_at 
ON order_edit_history(created_at DESC);

-- Habilitar RLS
ALTER TABLE order_edit_history ENABLE ROW LEVEL SECURITY;

-- Política para lojistas verem histórico dos pedidos de sua loja
CREATE POLICY "Store owners can view order edit history"
ON order_edit_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = order_edit_history.order_id
    AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Política para lojistas inserirem histórico dos pedidos de sua loja
CREATE POLICY "Store owners can insert order edit history"
ON order_edit_history FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = order_edit_history.order_id
    AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

COMMENT ON TABLE order_edit_history IS 'Histórico de todas as edições feitas nos pedidos';
COMMENT ON COLUMN order_edit_history.changes IS 'JSON com os campos alterados e seus valores anteriores e novos';
