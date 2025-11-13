-- Permitir que todos os usuários autenticados visualizem o status do WhatsApp das lojas
-- Remove a política antiga que restringe a visualização
DROP POLICY IF EXISTS "Store owners and employees can view instances" ON public.store_instances;

-- Cria nova política permitindo que todos os usuários autenticados vejam o status
CREATE POLICY "Anyone can view WhatsApp instances"
ON public.store_instances
FOR SELECT
TO authenticated
USING (true);

-- Manter as políticas de inserção, atualização e exclusão restritas apenas a donos e funcionários
-- Essas políticas já existem e não precisam ser modificadas:
-- - Store owners and employees can insert instances
-- - Store owners and employees can update instances  
-- - Store owners and employees can delete instances
