-- Configurar REPLICA IDENTITY FULL para eventos Realtime funcionarem corretamente
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE affiliate_earnings REPLICA IDENTITY FULL;