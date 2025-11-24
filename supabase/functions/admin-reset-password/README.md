# Admin Reset Password - Supabase Edge Function

## Como usar

### 1. Instalar Supabase CLI

**⚠️ IMPORTANTE:** Não use `npm install -g supabase` - não funciona!

**Windows (Recomendado - Scoop):**
```powershell
# Instalar Scoop primeiro
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Windows (Alternativa - Chocolatey):**
```powershell
choco install supabase
```

**Windows (Alternativa - npm local):**
```bash
npm install supabase --save-dev
# Depois use: npx supabase [comando]
```

### 2. Fazer Login

```bash
supabase login
```

### 3. Linkar ao Projeto

```bash
supabase link --project-ref seu-project-ref
```

**Onde encontrar o project-ref:**
- Na URL do seu projeto Supabase: `https://abcdefghijklmnop.supabase.co`
- O `project-ref` é: `abcdefghijklmnop`

### 4. Deploy da Função

```bash
supabase functions deploy admin-reset-password
```

**Nota:** As variáveis de ambiente (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) são configuradas automaticamente quando você faz o link do projeto.

## Endpoint

`POST https://seu-projeto.supabase.co/functions/v1/admin-reset-password`

Headers:
- `Authorization: Bearer {token-do-admin}`
- `apikey: {sua-anon-key}`

Body:
```json
{
  "userId": "uuid-do-usuario"
}
```

## Resposta de Sucesso

```json
{
  "success": true,
  "password": "Abc123XyZ456",
  "message": "Senha resetada com sucesso"
}
```

## Como Funciona

1. Verifica se o usuário que faz a requisição é admin
2. Gera uma senha aleatória de 12 caracteres
3. Atualiza a senha do atleta no Supabase Auth
4. Marca `must_change_password = true` no perfil do atleta
5. Retorna a senha temporária para o admin copiar e passar ao atleta

## Segurança

- Apenas administradores podem usar esta função
- Requer autenticação válida (token Bearer)
- Senha é gerada aleatoriamente e é única

