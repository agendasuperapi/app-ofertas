# 🚨 Como Corrigir o Erro de Criação de Pedido

## Problema Atual

O erro acontece porque a coluna `notes` não existe na tabela `orders` do seu banco de dados atual (Lovable Cloud).

```
Order creation failed: {
  "message": "Could not find the 'notes' column of 'orders' in the schema cache"
}
```

## ✅ Solução Rápida (Lovable Cloud)

**SE VOCÊ AINDA ESTÁ USANDO LOVABLE CLOUD:**

1. Aguarde a migration ser executada automaticamente pelo sistema
2. **OU** clique no botão "Execute migration" que deve aparecer no painel do Lovable
3. Após a execução, teste novamente criar um pedido

A migration que corrige isso já foi criada:
- Arquivo: `supabase/migrations/20251111031807_1dbb8c48-4047-4d20-811e-8b542d1b8e0e.sql`
- Comando: `ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text;`

## 🔄 Solução Completa (Migrar para Supabase Próprio)

**SE VOCÊ QUER USAR SEU PRÓPRIO SUPABASE:**

Siga o guia completo em `MIGRATION_GUIDE.md`. O arquivo `setup_supabase.sql` já inclui a coluna `notes` na criação da tabela, então você não terá esse problema.

### Passos Resumidos:

1. **Criar projeto** no [supabase.com](https://supabase.com)
2. **Anotar credenciais** (URL e Keys)
3. **Executar** o script `setup_supabase.sql` no SQL Editor
4. **Desconectar** Lovable Cloud no Lovable
5. **Conectar** seu Supabase próprio
6. **Testar** criação de pedidos

## 🧪 Teste Após Correção

Para verificar se funcionou:

1. Adicione produtos ao carrinho
2. Vá para a página de Checkout (/cart)
3. Preencha todos os campos obrigatórios:
   - Nome completo
   - Telefone
   - Tipo de entrega (Entrega/Retirada)
   - Se Entrega: Rua, Número, Bairro
   - Forma de pagamento
   - **Observações** (campo que usa a coluna `notes`)
4. Finalize o pedido
5. Verifique se o pedido foi criado com sucesso

## ❓ Ainda com Erro?

Se após executar a migration o erro persistir:

1. **Verifique** se a coluna foi criada:
   - No dashboard do Lovable Cloud, vá em Database
   - Abra a tabela `orders`
   - Confirme que existe a coluna `notes`

2. **Limpe o cache** do navegador e recarregue a página

3. **Verifique os logs** para outros erros possíveis

## 📝 Observações

- A coluna `notes` é **opcional** - pode ser deixada em branco
- Ela serve para o cliente adicionar observações sobre o pedido
- O campo aceita até 500 caracteres
