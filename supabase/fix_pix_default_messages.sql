-- =====================================================
-- Fix PIX Default Messages
-- Description: Updates the default PIX messages function
--              and fixes existing stores with incorrect values
-- =====================================================

-- 1. Drop and recreate the function with correct default values
DROP FUNCTION IF EXISTS set_default_pix_messages() CASCADE;

CREATE OR REPLACE FUNCTION set_default_pix_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default PIX fixed key messages if not provided
  IF NEW.pix_message_title IS NULL THEN
    NEW.pix_message_title := '💳 Pagamento via PIX';
  END IF;
  
  IF NEW.pix_message_description IS NULL THEN
    NEW.pix_message_description := 'Clique no botão abaixo para copiar a chave PIX, favor enviar o comprovante após o pagamento.';
  END IF;
  
  IF NEW.pix_message_footer IS NULL THEN
    NEW.pix_message_footer := 'Obrigado pela preferência!';
  END IF;
  
  IF NEW.pix_message_button_text IS NULL THEN
    NEW.pix_message_button_text := '📋 COPIAR CHAVE PIX';
  END IF;
  
  IF NEW.pix_message_enabled IS NULL THEN
    NEW.pix_message_enabled := false;
  END IF;
  
  -- Set default PIX Copia e Cola messages if not provided
  IF NEW.pix_copiacola_message_title IS NULL THEN
    NEW.pix_copiacola_message_title := '💳 Código PIX Gerado';
  END IF;
  
  IF NEW.pix_copiacola_message_description IS NULL THEN
    NEW.pix_copiacola_message_description := '1️⃣ Copie o código PIX abaixo.
2️⃣ Abra o app do seu banco e vá até a opção PIX.
3️⃣ Toque em "PIX Copia e Cola", cole o código e confirme o pagamento. 💳✨';
  END IF;
  
  IF NEW.pix_copiacola_message_footer IS NULL THEN
    NEW.pix_copiacola_message_footer := 'Código válido para este pedido específico.';
  END IF;
  
  IF NEW.pix_copiacola_message_button_text IS NULL THEN
    NEW.pix_copiacola_message_button_text := '📋 COPIAR CÓDIGO PIX';
  END IF;
  
  IF NEW.pix_copiacola_button_text IS NULL THEN
    NEW.pix_copiacola_button_text := '📋 COPIAR CÓDIGO PIX';
  END IF;
  
  IF NEW.pix_copiacola_message_enabled IS NULL THEN
    NEW.pix_copiacola_message_enabled := false;
  END IF;
  
  -- Set show_pix_key_to_customer default
  IF NEW.show_pix_key_to_customer IS NULL THEN
    NEW.show_pix_key_to_customer := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recreate trigger
DROP TRIGGER IF EXISTS set_default_pix_messages_trigger ON public.stores;
CREATE TRIGGER set_default_pix_messages_trigger
  BEFORE INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION set_default_pix_messages();

-- 3. Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_default_pix_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION set_default_pix_messages() TO service_role;

-- 4. Update ALL existing stores with the correct default values
UPDATE public.stores
SET
  pix_message_title = '💳 Pagamento via PIX',
  pix_message_description = 'Clique no botão abaixo para copiar a chave PIX, favor enviar o comprovante após o pagamento.',
  pix_message_footer = 'Obrigado pela preferência!',
  pix_message_button_text = '📋 COPIAR CHAVE PIX',
  pix_message_enabled = false,
  pix_copiacola_message_title = '💳 Código PIX Gerado',
  pix_copiacola_message_description = '1️⃣ Copie o código PIX abaixo.
2️⃣ Abra o app do seu banco e vá até a opção PIX.
3️⃣ Toque em "PIX Copia e Cola", cole o código e confirme o pagamento. 💳✨',
  pix_copiacola_message_footer = 'Código válido para este pedido específico.',
  pix_copiacola_message_button_text = '📋 COPIAR CÓDIGO PIX',
  pix_copiacola_button_text = '📋 COPIAR CÓDIGO PIX',
  pix_copiacola_message_enabled = false,
  show_pix_key_to_customer = true;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
