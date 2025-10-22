# 🔧 Configuração Específica do Supabase

## 📋 Suas Credenciais Recebidas

Você forneceu as seguintes informações de conexão PostgreSQL:
- **Host**: `aws-1-sa-east-1.pooler.supabase.com`
- **Port**: `5432`
- **Database**: `postgres`
- **User**: `postgres.fqodpsccxvifxifnfqhz`
- **Password**: `159357852789We*`
- **Pool Mode**: `session`

## ⚠️ IMPORTANTE: Obter URL e Chave do Supabase

As credenciais PostgreSQL que você forneceu são para **conexão direta ao banco**. Para usar o **frontend React**, precisamos das credenciais do **Supabase Dashboard**.

### 🎯 Passos para Obter as Credenciais Corretas:

1. **Acesse o Supabase Dashboard**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta

2. **Selecione seu Projeto**
   - Clique no projeto que corresponde ao banco `postgres.fqodpsccxvifxifnfqhz`

3. **Acesse as Configurações de API**
   - No menu lateral, clique em **Settings**
   - Clique em **API**

4. **Copie as Informações Necessárias**
   - **Project URL**: algo como `https://fqodpsccxvifxifnfqhz.supabase.co`
   - **anon public**: uma chave longa que começa com `eyJ...`

## 🔧 Configuração do Projeto

### 1️⃣ Criar Arquivo de Configuração
```bash
# Na pasta do projeto, copie o arquivo de exemplo:
copy .env.example .env.local
```

### 2️⃣ Editar o Arquivo .env.local
Abra o arquivo `.env.local` e configure:

```env
# Modo do banco
APP_DB_MODE=supabase

# Configurações do Supabase (substitua pelos valores reais)
REACT_APP_SUPABASE_URL=https://fqodpsccxvifxifnfqhz.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...sua-chave-anonima-aqui...
```

### 3️⃣ Configurar o Banco de Dados

**Opção A: Via SQL Editor do Supabase (Recomendado)**
1. No dashboard do Supabase, vá em **SQL Editor**
2. Copie todo o conteúdo do arquivo `sql/schema.sql`
3. Cole no editor e execute

**Opção B: Via Conexão Direta (Avançado)**
Se você tem acesso direto ao PostgreSQL, pode executar:
```bash
psql -h aws-1-sa-east-1.pooler.supabase.com -p 5432 -U postgres.fqodpsccxvifxifnfqhz -d postgres -f sql/schema.sql
```

### 4️⃣ Inserir Dados de Exemplo
```bash
npm run setup-supabase
```

### 5️⃣ Executar o Aplicativo
```bash
npm start
```

## 🔒 Segurança

### ⚠️ NUNCA Exponha Estas Informações:
- ❌ Senha do PostgreSQL: `159357852789We*`
- ❌ Service Role Key (se obtiver)
- ❌ Credenciais de conexão direta

### ✅ Seguro para Frontend:
- ✅ Project URL: `https://....supabase.co`
- ✅ Anon Key: `eyJ...` (chave pública)

## 🛠️ Estrutura das Tabelas

O arquivo `sql/schema.sql` criará:

### 👥 Tabela `members`
- `id` - ID único
- `name` - Nome do sócio
- `phone` - Telefone
- `observation` - Observações
- `created_at`, `updated_at` - Timestamps

### 💳 Tabela `payments`
- `id` - ID único
- `member_id` - Referência ao sócio
- `amount` - Valor
- `category` - Categoria
- `observation` - Observações
- `due_date` - Data de vencimento
- `paid_at` - Data de pagamento
- `status` - Status (pending/paid/expense)
- `created_at`, `updated_at` - Timestamps

### 📊 Views e Funções
- `monthly_summary` - Resumo mensal
- `member_stats` - Estatísticas por sócio
- Funções para marcar pagamentos como pagos

## 🚀 Próximos Passos

1. ✅ Obtenha a URL e anon key do dashboard Supabase
2. ✅ Configure o arquivo `.env.local`
3. ✅ Execute o schema SQL no Supabase
4. ✅ Execute `npm run setup-supabase`
5. ✅ Execute `npm start`
6. ✅ Teste o aplicativo!

## 🆘 Precisa de Ajuda?

Se não conseguir acessar o dashboard do Supabase ou obter as credenciais:

1. **Verifique seu email** - pode ter um convite do Supabase
2. **Contate quem criou o projeto** - eles podem te dar acesso
3. **Use modo local** - altere `.env.local` para `APP_DB_MODE=local`

---

**🎯 Lembre-se: O importante é obter a URL e anon key do dashboard Supabase, não apenas as credenciais PostgreSQL!**
