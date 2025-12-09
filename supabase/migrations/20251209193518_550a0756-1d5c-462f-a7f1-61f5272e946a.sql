-- Corrigir comissões de fabiana@gmail.com que já foram pagas via saque
-- Saque ID: c4cfe1f4-... foi marcado como paid em 2025-12-09 18:43:50
-- Mas as comissões ainda estavam com status 'pending'

UPDATE affiliate_earnings 
SET 
  status = 'paid', 
  paid_at = '2025-12-09T18:43:50+00:00'
WHERE id IN (
  '5c3ff480-5ee2-431d-a5cb-3b2710751690',  -- R$ 33,00 (pedido #03998719 - delivered)
  'd9eb67a6-e568-4ca9-a031-eb481d41c1bd'   -- R$ 40,50 (pedido #55381151 - delivered)
)
AND status = 'pending';