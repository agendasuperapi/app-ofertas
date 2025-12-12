-- Remover a versão antiga da função (apenas 1 parâmetro) para forçar uso da versão com editor
DROP FUNCTION IF EXISTS reprocess_affiliate_commission_for_order(uuid);