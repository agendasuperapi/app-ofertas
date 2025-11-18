-- =====================================================
-- Migration: Add PIX Message Configuration to Stores
-- Description: Adiciona campos para configurar mensagem
--              automática de PIX com botão no WhatsApp
-- =====================================================

-- 1. ADD COLUMNS TO STORES TABLE
-- =====================================================
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS pix_message_title TEXT DEFAULT '💳 Pagamento via PIX',
  ADD COLUMN IF NOT EXISTS pix_message_description TEXT DEFAULT 'Clique no botão abaixo para copiar o código PIX, favor enviar o comprovante após o pagamento.',
  ADD COLUMN IF NOT EXISTS pix_message_footer TEXT DEFAULT 'Obrigado pela preferência!',
  ADD COLUMN IF NOT EXISTS pix_message_button_text TEXT DEFAULT '📋 COPIAR CHAVE PIX',
  ADD COLUMN IF NOT EXISTS pix_message_enabled BOOLEAN DEFAULT false;

-- 2. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN public.stores.pix_message_title IS 'Título da mensagem PIX automática enviada via WhatsApp';
COMMENT ON COLUMN public.stores.pix_message_description IS 'Descrição da mensagem PIX automática enviada via WhatsApp';
COMMENT ON COLUMN public.stores.pix_message_footer IS 'Rodapé da mensagem PIX automática enviada via WhatsApp';
COMMENT ON COLUMN public.stores.pix_message_button_text IS 'Texto do botão de copiar PIX no WhatsApp';
COMMENT ON COLUMN public.stores.pix_message_enabled IS 'Ativa/desativa envio automático da mensagem PIX';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- COMO USAR:
-- 1. Copie todo este código
-- 2. Vá para: https://supabase.com/dashboard/project/mgpzowiahnwcmcaelogf/sql/new
-- 3. Cole o código no editor SQL
-- 4. Clique em "Run" para executar
-- 5. Verifique se não há erros no console

-- ROLLBACK (se necessário):
-- ALTER TABLE public.stores
--   DROP COLUMN IF EXISTS pix_message_title,
--   DROP COLUMN IF EXISTS pix_message_description,
--   DROP COLUMN IF EXISTS pix_message_footer,
--   DROP COLUMN IF EXISTS pix_message_button_text,
--   DROP COLUMN IF EXISTS pix_message_enabled;
