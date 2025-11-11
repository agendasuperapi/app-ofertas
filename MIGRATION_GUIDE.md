# Guia de Migração para Supabase Próprio

## 📌 Passos para Migração

### 1. Preparação no Supabase

1. **Acesse** [supabase.com](https://supabase.com)
2. **Crie** um novo projeto
3. **Anote** as credenciais:
   - Project URL
   - Anon Key (chave pública)
   - Service Role Key (chave privada)

### 2. Configurar Autenticação

No dashboard do Supabase, vá em **Authentication > Providers**:
- Habilite **Email Provider**
- Em **Email Auth**:
  - ✅ Enable email confirmations: **OFF** (para desenvolvimento)
  - ✅ Enable email signup: **ON**

### 3. Executar Migrations

1. No dashboard do Supabase, vá em **SQL Editor**
2. Execute todos os arquivos de migration da pasta `supabase/migrations/` na ordem cronológica
3. Execute também as functions e triggers

### 4. Configurar Storage Buckets

Execute no SQL Editor:

```sql
-- Criar buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('store-logos', 'store-logos', true),
  ('store-banners', 'store-banners', true),
  ('product-images', 'product-images', true);

-- Políticas de storage para store-logos
CREATE POLICY "Store logos são públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-logos');

CREATE POLICY "Donos podem fazer upload de logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-logos' 
  AND auth.uid() IS NOT NULL
);

-- Políticas de storage para store-banners
CREATE POLICY "Store banners são públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-banners');

CREATE POLICY "Donos podem fazer upload de banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'store-banners' 
  AND auth.uid() IS NOT NULL
);

-- Políticas de storage para product-images
CREATE POLICY "Product images são públicos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Donos podem fazer upload de imagens de produtos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.uid() IS NOT NULL
);
```

### 5. Configurar Secrets no Supabase

No dashboard, vá em **Project Settings > Edge Functions > Secrets**:
- Adicione `EVOLUTION_API_KEY` (se usar WhatsApp)

### 6. Atualizar Credenciais no Projeto Lovable

1. No Lovable, vá em **Settings > Tools**
2. **Desconecte** do Lovable Cloud
3. **Conecte** ao seu Supabase usando as credenciais que você anotou

### 7. Importar Dados (Opcional)

Se você tem dados no Lovable Cloud que quer migrar:

1. Execute o script `export-data.sql` no Lovable Cloud
2. Salve os resultados
3. No seu Supabase, use o SQL Editor para importar os dados

### 8. Testar a Aplicação

1. Faça login/cadastro para testar autenticação
2. Teste upload de imagens
3. Teste criação de pedidos
4. Verifique se as edge functions estão funcionando

## ⚠️ Importante

- **Backup**: Sempre faça backup dos dados antes de migrar
- **Credenciais**: Nunca compartilhe suas credenciais
- **RLS**: Certifique-se de que as políticas RLS estão ativas
- **Auth**: Configure corretamente as URLs de redirect

## 🔗 Links Úteis

- [Documentação Supabase](https://supabase.com/docs)
- [Guia de Migrations](https://supabase.com/docs/guides/cli/local-development)
- [Autenticação](https://supabase.com/docs/guides/auth)
