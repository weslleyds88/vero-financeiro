# 🔧 Corrigir Erro do .env.local

## ❌ Erro
```
failed to parse environment file: .env.local (unexpected character '»' in variable name)
```

## 🔍 Causa
O arquivo `.env.local` tem problemas de encoding (caracteres especiais ou BOM - Byte Order Mark).

## ✅ Solução

### Opção 1: Recriar o arquivo (Recomendado)

1. **Abra o Notepad++ ou VS Code** (não use o Bloco de Notas do Windows)

2. **Crie um novo arquivo** chamado `.env.local` na raiz do projeto `C:\Vero despesas`

3. **Cole o conteúdo** (substitua pelos seus valores reais):

```env
REACT_APP_SUPABASE_URL=https://fqodpsccxvifxifnfqhz.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui
```

4. **Salve o arquivo** com encoding **UTF-8** (sem BOM):
   - No Notepad++: Encoding → Converter para UTF-8 (sem BOM)
   - No VS Code: Clique no encoding no canto inferior direito → "Save with Encoding" → "UTF-8"

### Opção 2: Usar comando alternativo

Se não conseguir corrigir o arquivo, você pode fazer o link sem usar o `.env.local`:

```bash
# No diretório do projeto Vero
cd "C:\Vero despesas"

# Fazer link especificando as variáveis diretamente
supabase link --project-ref fqodpsccxvifxifnfqhz
```

### Opção 3: Mover temporariamente o arquivo

```bash
# Renomear o arquivo temporariamente
ren .env.local .env.local.backup

# Fazer o link
supabase link --project-ref fqodpsccxvifxifnfqhz

# Renomear de volta depois
ren .env.local.backup .env.local
```

## 📝 Verificar se está correto

O arquivo `.env.local` deve ter exatamente este formato (sem espaços extras, sem caracteres especiais):

```
REACT_APP_SUPABASE_URL=https://fqodpsccxvifxifnfqhz.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua-chave-aqui
```

**Importante:**
- Sem espaços antes ou depois do `=`
- Sem aspas nas variáveis
- Sem caracteres especiais no início
- Encoding UTF-8 sem BOM

## ✅ Depois de corrigir

Tente novamente:

```bash
cd "C:\Vero despesas"
supabase link --project-ref fqodpsccxvifxifnfqhz
```

