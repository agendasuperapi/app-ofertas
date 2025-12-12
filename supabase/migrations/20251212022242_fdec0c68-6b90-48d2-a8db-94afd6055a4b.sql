-- Adicionar coluna master_user_email à tabela stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS master_user_email TEXT;

-- Adicionar comentário descritivo
COMMENT ON COLUMN stores.master_user_email IS 'Email do usuário master da loja (formato: primeiros 8 chars do UUID@ofertas.app)';