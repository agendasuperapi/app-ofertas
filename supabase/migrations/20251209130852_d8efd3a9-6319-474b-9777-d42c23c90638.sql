-- Tabela de solicitações de saque de comissões
CREATE TABLE public.affiliate_withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  store_affiliate_id UUID REFERENCES store_affiliates(id) ON DELETE SET NULL,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  pix_key TEXT,
  payment_method TEXT DEFAULT 'pix',
  payment_proof TEXT,
  notes TEXT,
  admin_notes TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_withdrawal_requests_affiliate ON affiliate_withdrawal_requests(affiliate_id);
CREATE INDEX idx_withdrawal_requests_store ON affiliate_withdrawal_requests(store_id);
CREATE INDEX idx_withdrawal_requests_status ON affiliate_withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_store_affiliate ON affiliate_withdrawal_requests(store_affiliate_id);

-- Trigger para updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON affiliate_withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE affiliate_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Afiliados podem ver suas próprias solicitações
CREATE POLICY "Affiliates can view their withdrawal requests"
  ON affiliate_withdrawal_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = affiliate_withdrawal_requests.affiliate_id
      AND a.user_id = auth.uid()
    )
  );

-- Afiliados podem criar solicitações
CREATE POLICY "Affiliates can create withdrawal requests"
  ON affiliate_withdrawal_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM affiliates a
      WHERE a.id = affiliate_withdrawal_requests.affiliate_id
      AND a.user_id = auth.uid()
    )
  );

-- Lojistas podem ver solicitações da sua loja
CREATE POLICY "Store owners can view withdrawal requests"
  ON affiliate_withdrawal_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = affiliate_withdrawal_requests.store_id
      AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Lojistas podem atualizar solicitações (aprovar, pagar, rejeitar)
CREATE POLICY "Store owners can update withdrawal requests"
  ON affiliate_withdrawal_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM stores s
      WHERE s.id = affiliate_withdrawal_requests.store_id
      AND (s.owner_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- Service role pode gerenciar tudo (para edge functions e triggers)
CREATE POLICY "Service role can manage withdrawal requests"
  ON affiliate_withdrawal_requests
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE affiliate_withdrawal_requests;