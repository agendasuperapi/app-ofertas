-- Function to set default PIX messages when a new store is created
CREATE OR REPLACE FUNCTION set_default_pix_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default PIX fixed key messages if not provided
  IF NEW.pix_message_title IS NULL THEN
    NEW.pix_message_title := 'Pagamento via PIX';
  END IF;
  
  IF NEW.pix_message_description IS NULL THEN
    NEW.pix_message_description := 'Use a chave PIX abaixo para realizar o pagamento:';
  END IF;
  
  IF NEW.pix_message_footer IS NULL THEN
    NEW.pix_message_footer := 'Após o pagamento, seu pedido será confirmado automaticamente.';
  END IF;
  
  IF NEW.pix_message_button_text IS NULL THEN
    NEW.pix_message_button_text := 'Copiar Chave PIX';
  END IF;
  
  IF NEW.pix_message_enabled IS NULL THEN
    NEW.pix_message_enabled := true;
  END IF;
  
  -- Set default PIX Copia e Cola messages if not provided
  IF NEW.pix_copiacola_message_title IS NULL THEN
    NEW.pix_copiacola_message_title := 'Pagamento via PIX Copia e Cola';
  END IF;
  
  IF NEW.pix_copiacola_message_description IS NULL THEN
    NEW.pix_copiacola_message_description := 'Copie o código PIX abaixo para realizar o pagamento:';
  END IF;
  
  IF NEW.pix_copiacola_message_footer IS NULL THEN
    NEW.pix_copiacola_message_footer := 'O código PIX é válido por 30 minutos. Após o pagamento, seu pedido será confirmado.';
  END IF;
  
  IF NEW.pix_copiacola_message_button_text IS NULL THEN
    NEW.pix_copiacola_message_button_text := 'Copiar Código PIX';
  END IF;
  
  IF NEW.pix_copiacola_button_text IS NULL THEN
    NEW.pix_copiacola_button_text := 'Pagar com PIX';
  END IF;
  
  IF NEW.pix_copiacola_message_enabled IS NULL THEN
    NEW.pix_copiacola_message_enabled := true;
  END IF;
  
  -- Set show_pix_key_to_customer default
  IF NEW.show_pix_key_to_customer IS NULL THEN
    NEW.show_pix_key_to_customer := true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run before insert on stores
DROP TRIGGER IF EXISTS set_default_pix_messages_trigger ON public.stores;
CREATE TRIGGER set_default_pix_messages_trigger
  BEFORE INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION set_default_pix_messages();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_default_pix_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION set_default_pix_messages() TO service_role;

-- Update existing stores that don't have PIX messages configured
UPDATE public.stores
SET
  pix_message_title = COALESCE(pix_message_title, 'Pagamento via PIX'),
  pix_message_description = COALESCE(pix_message_description, 'Use a chave PIX abaixo para realizar o pagamento:'),
  pix_message_footer = COALESCE(pix_message_footer, 'Após o pagamento, seu pedido será confirmado automaticamente.'),
  pix_message_button_text = COALESCE(pix_message_button_text, 'Copiar Chave PIX'),
  pix_message_enabled = COALESCE(pix_message_enabled, true),
  pix_copiacola_message_title = COALESCE(pix_copiacola_message_title, 'Pagamento via PIX Copia e Cola'),
  pix_copiacola_message_description = COALESCE(pix_copiacola_message_description, 'Copie o código PIX abaixo para realizar o pagamento:'),
  pix_copiacola_message_footer = COALESCE(pix_copiacola_message_footer, 'O código PIX é válido por 30 minutos. Após o pagamento, seu pedido será confirmado.'),
  pix_copiacola_message_button_text = COALESCE(pix_copiacola_message_button_text, 'Copiar Código PIX'),
  pix_copiacola_button_text = COALESCE(pix_copiacola_button_text, 'Pagar com PIX'),
  pix_copiacola_message_enabled = COALESCE(pix_copiacola_message_enabled, true),
  show_pix_key_to_customer = COALESCE(show_pix_key_to_customer, true)
WHERE pix_message_title IS NULL 
   OR pix_copiacola_message_title IS NULL;
