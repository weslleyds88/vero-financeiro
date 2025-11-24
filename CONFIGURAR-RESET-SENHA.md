# 🔐 Configuração do Reset de Senha - Vero Clube

## 📋 Visão Geral

O sistema de reset de senha do Vero Clube funciona **sem usar emails**, evitando limites do Supabase e necessidade de email corporativo. O fluxo é simples:

1. **Admin reseta senha**: Clica no botão 🔑 ao lado do atleta na lista de atletas
2. **Sistema gera senha temporária**: Uma senha aleatória de 12 caracteres é gerada
3. **Senha é copiada**: A senha é automaticamente copiada para área de transferência
4. **Admin passa para atleta**: Admin envia a senha temporária por WhatsApp, pessoalmente, etc.
5. **Atleta faz login**: Usa a senha temporária para entrar
6. **Troca obrigatória**: Sistema força o atleta a trocar a senha antes de continuar

## ⚙️ Configuração

### 1. Instalar Supabase CLI

**⚠️ IMPORTANTE:** O Supabase CLI não pode ser instalado via `npm install -g`. Use uma das opções abaixo:

#### Opção A: Via Scoop (Recomendado para Windows)

```powershell
# Instalar Scoop (se ainda não tiver)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### Opção B: Via Chocolatey

```powershell
# Instalar Chocolatey (se ainda não tiver)
# Acesse: https://chocolatey.org/install

# Instalar Supabase CLI
choco install supabase
```

#### Opção C: Via npm (apenas localmente no projeto)

```bash
# Instalar localmente no projeto (não globalmente)
npm install supabase --save-dev

# Usar com npx
npx supabase login
npx supabase link --project-ref seu-project-ref
npx supabase functions deploy admin-reset-password
```

#### Opção D: Download Manual (Windows)

1. Acesse: https://github.com/supabase/cli/releases
2. Baixe o arquivo `supabase_windows_amd64.zip`
3. Extraia e adicione ao PATH do Windows

### 2. Deploy da Edge Function

Após instalar o CLI:

```bash
# Fazer login no Supabase
supabase login

# Linkar ao projeto (substitua pelo seu project-ref)
supabase link --project-ref seu-project-ref

# Deploy da função
supabase functions deploy admin-reset-password
```

**Nota:** O `project-ref` pode ser encontrado na URL do seu projeto Supabase:
- Exemplo: `https://abcdefghijklmnop.supabase.co`
- O `project-ref` seria: `abcdefghijklmnop`

### 3. Como Usar

1. Acesse a página **"Atletas"** como administrador
2. Encontre o atleta que precisa resetar a senha
3. Clique no botão **🔑** ao lado do nome do atleta
4. Confirme a ação
5. A senha temporária será gerada e copiada automaticamente
6. Envie a senha temporária para o atleta (WhatsApp, pessoalmente, etc.)
7. O atleta faz login com a senha temporária
8. O sistema força a troca de senha na primeira vez que entrar

## 🔧 Como Funciona

1. **Admin clica em resetar**: Botão 🔑 na lista de atletas
2. **Edge Function é chamada**: `admin-reset-password` gera senha aleatória
3. **Senha é atualizada**: No Supabase Auth do atleta
4. **Flag é setado**: `must_change_password = true` no perfil
5. **Senha é retornada**: Para o admin copiar e passar ao atleta
6. **Atleta faz login**: Com a senha temporária
7. **Tela de troca aparece**: `ForceChangePassword` é exibida automaticamente
8. **Atleta troca senha**: Define uma nova senha permanente
9. **Flag é removido**: `must_change_password = false`

## ✅ Vantagens

- ✅ **Sem limites de email**: Não usa sistema de emails do Supabase
- ✅ **Sem email corporativo**: Não precisa configurar SMTP ou serviços de email
- ✅ **Simples e direto**: Admin passa senha diretamente para o atleta
- ✅ **Seguro**: Senha temporária é única e aleatória
- ✅ **Obrigatório trocar**: Atleta não pode continuar sem trocar a senha

## 🐛 Troubleshooting

### Erro "Token de autenticação necessário"
- Certifique-se de estar logado como admin
- Faça logout e login novamente

### Erro "Apenas administradores podem resetar senhas"
- Verifique se seu perfil tem `role = 'admin'` na tabela `profiles`

### Erro "Usuário não encontrado"
- Verifique se o atleta existe na tabela `profiles`
- Confirme que o atleta tem um email cadastrado

### Senha não foi copiada
- Verifique se o navegador permite acesso à área de transferência
- Copie manualmente a senha que aparece no alerta

## 📝 Notas Importantes

- Senhas temporárias têm 12 caracteres (letras maiúsculas, minúsculas e números)
- A senha temporária é válida até o atleta trocar
- Após resetar, o atleta **DEVE** trocar a senha no próximo login
- A senha temporária é mostrada apenas uma vez (no alerta)

## 🔒 Segurança

- Apenas administradores podem resetar senhas
- Senhas são geradas aleatoriamente e são únicas
- Atleta é obrigado a trocar a senha temporária
- Não há envio de senha por email (mais seguro)
