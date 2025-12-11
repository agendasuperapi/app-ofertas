-- Trigger de segurança para sincronizar affiliates com store_affiliates
-- Este trigger garante sincronização mesmo se o fluxo normal falhar

CREATE OR REPLACE FUNCTION sync_affiliate_to_store_affiliates()
RETURNS TRIGGER AS $$
DECLARE
  v_account_id UUID;
  v_store_affiliate_id UUID;
BEGIN
  -- Se affiliate_account_id já está definido, usar diretamente
  IF NEW.affiliate_account_id IS NOT NULL THEN
    v_account_id := NEW.affiliate_account_id;
  ELSE
    -- Buscar affiliate_account pelo CPF normalizado
    IF NEW.cpf_cnpj IS NOT NULL THEN
      SELECT id INTO v_account_id
      FROM affiliate_accounts
      WHERE REGEXP_REPLACE(cpf_cnpj, '[^0-9]', '', 'g') = REGEXP_REPLACE(NEW.cpf_cnpj, '[^0-9]', '', 'g')
      LIMIT 1;
      
      -- Atualizar affiliate_account_id no registro se encontrou
      IF v_account_id IS NOT NULL THEN
        NEW.affiliate_account_id := v_account_id;
      END IF;
    END IF;
  END IF;
  
  -- Se encontrou conta, sincronizar com store_affiliates
  IF v_account_id IS NOT NULL THEN
    -- Verificar se já existe store_affiliate
    SELECT id INTO v_store_affiliate_id
    FROM store_affiliates
    WHERE affiliate_account_id = v_account_id 
    AND store_id = NEW.store_id;
    
    -- Se existir, sincronizar dados de comissão
    IF v_store_affiliate_id IS NOT NULL THEN
      UPDATE store_affiliates SET
        default_commission_type = NEW.default_commission_type,
        default_commission_value = NEW.default_commission_value,
        use_default_commission = COALESCE(NEW.use_default_commission, true),
        commission_maturity_days = COALESCE(NEW.commission_maturity_days, 7),
        is_active = NEW.is_active,
        commission_enabled = COALESCE(NEW.commission_enabled, true)
      WHERE id = v_store_affiliate_id;
      
      RAISE NOTICE '[AFFILIATE SYNC] Updated store_affiliate % for affiliate %', v_store_affiliate_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Dropar trigger existente se houver
DROP TRIGGER IF EXISTS trigger_sync_affiliate_to_store_affiliates ON affiliates;

-- Criar trigger para INSERT e UPDATE
CREATE TRIGGER trigger_sync_affiliate_to_store_affiliates
  BEFORE INSERT OR UPDATE ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION sync_affiliate_to_store_affiliates();