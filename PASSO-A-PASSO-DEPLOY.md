# 🚀 Passo a Passo - Deploy da Edge Function

## ✅ Passo 1: Login no Supabase

Abra o terminal/PowerShell no diretório do projeto e execute:

```bash
supabase login
```

Ou se instalou localmente:
```bash
npx supabase login
```

Isso abrirá o navegador para você fazer login na sua conta Supabase.

## ✅ Passo 2: Linkar ao Projeto

Você precisa do **project-ref** do seu projeto Supabase:

1. Acesse o [painel do Supabase](https://app.supabase.com)
2. Selecione seu projeto do **Vero Clube**
3. Vá em **Settings** → **General**
4. Copie o **Reference ID** (ou pegue da URL: `https://SEU-PROJECT-REF.supabase.co`)

Depois execute:

```bash
supabase link --project-ref SEU-PROJECT-REF-AQUI
```

Ou se instalou localmente:
```bash
npx supabase link --project-ref SEU-PROJECT-REF-AQUI
```

**Exemplo:**
```bash
supabase link --project-ref fqodpsccxvifxifnfqhz
```

## ✅ Passo 3: Deploy da Função

Agora faça o deploy da função:

```bash
supabase functions deploy admin-reset-password
```

Ou se instalou localmente:
```bash
npx supabase functions deploy admin-reset-password
```

## ✅ Passo 4: Verificar se Funcionou

Se tudo deu certo, você verá uma mensagem de sucesso tipo:

```
Deployed Function admin-reset-password
```

## 🧪 Testar

1. Acesse a aplicação como admin
2. Vá em **Atletas**
3. Clique no botão **🔑** ao lado de um atleta
4. Confirme e veja se a senha temporária é gerada

## ❌ Se Der Erro

### Erro "Project not found"
- Verifique se o project-ref está correto
- Certifique-se de estar logado na conta certa

### Erro "Permission denied"
- Verifique se você tem acesso ao projeto no Supabase
- Certifique-se de ser o owner ou ter permissões de deploy

### Erro "Function not found"
- Verifique se está no diretório correto do projeto
- Confirme que a pasta `supabase/functions/admin-reset-password` existe

## 📝 Próximos Passos Após Deploy

Após o deploy bem-sucedido:
1. ✅ A função estará disponível em: `https://seu-projeto.supabase.co/functions/v1/admin-reset-password`
2. ✅ O botão 🔑 na lista de atletas já funcionará automaticamente
3. ✅ Não precisa configurar mais nada!

