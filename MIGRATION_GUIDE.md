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
2. Abra o arquivo **`setup_supabase.sql`** na raiz do projeto
3. **Copie todo o conteúdo** deste arquivo
4. **Cole no SQL Editor** do Supabase
5. **Execute** o script (botão RUN)
6. Aguarde a conclusão (leva ~1 minuto)

### 4. Configurar Secrets no Supabase

No dashboard, vá em **Project Settings > Edge Functions > Secrets**:
- Adicione `EVOLUTION_API_KEY` (se usar WhatsApp)

### 5. Atualizar Credenciais no Projeto Lovable

1. No Lovable, vá em **Settings > Tools**
2. **Desconecte** do Lovable Cloud
3. **Conecte** ao seu Supabase usando as credenciais que você anotou

### 6. Importar Dados (Opcional)

Se você tem dados no Lovable Cloud que quer migrar:

1. Execute o script `export-data.sql` no Lovable Cloud
2. Salve os resultados
3. No seu Supabase, use o SQL Editor para importar os dados

### 7. Testar a Aplicação

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
