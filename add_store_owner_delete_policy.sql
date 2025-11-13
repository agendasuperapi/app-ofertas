-- Adicionar política para permitir que lojistas deletem itens de pedidos de sua loja
CREATE POLICY "Store owners can delete order items for their store orders"
ON order_items FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = order_items.order_id
    AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);
