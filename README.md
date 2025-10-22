# Despesas Vero 🏐💰

**Sistema de gestão financeira do Vero Volei**

Sistema completo para gerenciar atletas, pagamentos, receitas e despesas do seu time de vôlei. Interface moderna, responsiva e fácil de usar.

## ✨ Funcionalidades

### 👥 Gestão de Atletas
- ✅ Cadastro completo (nome, telefone, observações)
- ✅ Busca e filtros
- ✅ Visualização individual por atleta
- ✅ Histórico de pagamentos por atleta

### 💳 Gestão de Pagamentos
- ✅ Registro de receitas e despesas
- ✅ Categorização (mensalidade, uniforme, taxa de inscrição, etc.)
- ✅ **Marcar como "Pago" com um clique**
- ✅ **Seleção múltipla e ação em lote**
- ✅ Filtros por mês, atleta, categoria e status
- ✅ Status: Pendente, Pago, Despesa

### 📊 Relatórios e Visualizações
- ✅ Dashboard com estatísticas em tempo real
- ✅ **Calendário mensal** com resumo diário
- ✅ Visualização detalhada por atleta
- ✅ **Exportação em CSV e XLSX**
- ✅ **Backup completo em JSON e Excel**

### 🎯 Características Técnicas
- ✅ Interface responsiva (Tailwind CSS)
- ✅ Funciona **offline** (modo local)
- ✅ Funciona **online** (Supabase)
- ✅ App executável (.exe)
- ✅ Sem necessidade de login
- ✅ Dados seguros e privados

---

## 🚀 Instalação e Configuração

### 📋 Pré-requisitos
- **Node.js** 16+ ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))

### 1️⃣ Navegue para o Projeto
```bash
cd "C:\Projetos\Volei\team-treasury"
```

**Nota**: O projeto já está configurado na pasta `C:\Projetos\Volei\team-treasury\`

### 2️⃣ Instale as Dependências
```bash
npm install
```

### 3️⃣ Escolha o Modo de Banco

#### 🏠 **MODO LOCAL** (Recomendado para uso offline)
```bash
# Copie o arquivo de exemplo
copy .env.example .env.local

# Edite .env.local e configure:
APP_DB_MODE=local

# Inicialize o banco local
npm run init-db

# Insira dados de exemplo (opcional)
npm run seed

# Execute o app
npm start
```

#### ☁️ **MODO SUPABASE** (Para uso online/compartilhado)

**Passo 1: Configure o Supabase**
1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Vá em **Settings > API**
4. Copie a **URL** e **anon key**

**Passo 2: Configure as Variáveis**
```bash
# Copie o arquivo de exemplo
copy .env.example .env.local

# Edite .env.local e configure:
APP_DB_MODE=supabase
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

**Passo 3: Configure o Banco**
1. No dashboard do Supabase, vá em **SQL Editor**
2. Execute o conteúdo do arquivo `sql/schema.sql`
3. Execute o setup:
```bash
npm run setup-supabase
```

**Passo 4: Execute o App**
```bash
npm start
```

---

## 🖥️ Executando o Aplicativo

### 🌐 Modo Desenvolvimento (Navegador)
```bash
npm start
```
Acesse: http://localhost:3000

### 📱 Modo Electron (App Desktop)
```bash
npm run electron-dev
```

### 📦 Gerar Executável (.exe)
```bash
# Windows
npm run package-win

# macOS
npm run package-mac

# Linux
npm run package-linux
```

O arquivo `.exe` será gerado na pasta `dist/`

---

## 📁 Estrutura do Projeto

```
C:\Projetos\Volei\team-treasury/
├── 📂 public/              # Arquivos públicos e Electron
├── 📂 src/
│   ├── 📂 adapters/        # Camada de dados (Local/Supabase)
│   ├── 📂 components/      # Componentes React
│   ├── 📂 lib/            # Configurações (Supabase)
│   └── 📂 utils/          # Utilitários (datas, exports)
├── 📂 sql/                # Schema do banco
├── 📂 seeds/              # Dados de exemplo
├── 📂 scripts/            # Scripts de configuração
├── 📄 .env.example        # Exemplo de configuração
└── 📄 README.md           # Este arquivo
```

---

## 🎮 Como Usar

### 1️⃣ **Cadastrar Atletas**
- Vá em **Atletas** → **Novo Atleta**
- Preencha nome, telefone e observações
- Salve

### 2️⃣ **Registrar Pagamentos**
- Vá em **Pagamentos** → **Novo Pagamento**
- Escolha o tipo: Receita ou Despesa
- Selecione o atleta (se receita)
- Defina valor, categoria e data
- **Marque "Pago imediatamente"** se já foi pago

### 3️⃣ **Marcar como Pago** ⚡
- Na lista de pagamentos, clique no ✅ ao lado do pagamento
- **OU** selecione múltiplos e clique **"Marcar selecionados como Pago"**

### 4️⃣ **Visualizar Relatórios**
- **Dashboard**: Visão geral do mês
- **Calendário**: Movimentos por dia
- **Atletas**: Clique em um atleta para ver detalhes

### 5️⃣ **Exportar Dados**
- Use o botão **"Exportar"** em qualquer tela
- Escolha: CSV, Excel ou Backup completo
- Os filtros ativos são aplicados na exportação

---

## 🗂️ Backup e Restauração

### 📤 **Fazer Backup**
1. Vá em **Configurações**
2. Clique em **"Backup JSON"** ou **"Backup Excel"**
3. Arquivo será baixado automaticamente

### 📥 **Restaurar Backup**
1. Vá em **Configurações**
2. Clique em **"Escolher arquivo"**
3. Selecione o arquivo `.json` do backup
4. Clique em **"Restaurar Backup"**
5. ⚠️ **ATENÇÃO**: Isso substitui todos os dados atuais!

---

## 📊 Dados Armazenados

### 🏠 **Modo Local**
- **Windows**: `%APPDATA%/TeamTreasury/team_treasury.db`
- **macOS**: `~/Library/Application Support/TeamTreasury/`
- **Linux**: `~/.local/share/team_treasury/`

### ☁️ **Modo Supabase**
- Dados armazenados na nuvem do Supabase
- Acesso de qualquer dispositivo
- Backup automático do Supabase

---

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm start              # Executar em modo dev
npm run electron-dev   # Executar Electron em dev

# Banco Local
npm run init-db        # Criar banco SQLite
npm run seed           # Inserir dados de exemplo

# Banco Supabase
npm run setup-supabase # Configurar Supabase

# Build e Empacotamento
npm run build          # Build para produção
npm run package        # Gerar executável
npm run package-win    # Gerar .exe (Windows)

# Qualidade de Código
npm run lint           # Verificar código
npm run lint:fix       # Corrigir problemas
npm test               # Executar testes
```

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Interface de usuário
- **Tailwind CSS** - Estilização
- **React Router** - Navegação
- **date-fns** - Manipulação de datas

### Backend/Dados
- **SQLite** - Banco local (better-sqlite3)
- **Supabase** - Banco na nuvem
- **Electron** - App desktop

### Utilitários
- **SheetJS (xlsx)** - Exportação Excel
- **file-saver** - Download de arquivos

---

## 🐛 Solução de Problemas

### ❌ **Erro: "Configurações do Supabase não encontradas"**
**Solução:**
1. Verifique se o arquivo `.env.local` existe
2. Confirme se as variáveis estão corretas:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
3. Reinicie o servidor (`npm start`)

### ❌ **Erro: "Banco de dados não encontrado" (Modo Local)**
**Solução:**
```bash
npm run init-db
npm run seed
```

### ❌ **Erro ao gerar executável**
**Solução:**
1. Execute `npm run build` primeiro
2. Verifique se não há erros no build
3. Tente: `npm run package-win`

### ❌ **Dados não aparecem**
**Solução:**
1. Verifique o modo configurado em `.env.local`
2. Se Supabase: teste a conexão
3. Se Local: execute `npm run seed`

---

## 📝 Categorias Padrão

O sistema vem com as seguintes categorias pré-configuradas:
- 💰 **Mensalidade**
- 👕 **Uniforme**
- 📋 **Taxa de Inscrição**
- 🏟️ **Quadra**
- ⚽ **Material**
- 🚌 **Transporte**
- 🍕 **Alimentação**
- 👨‍⚖️ **Arbitragem**
- 📦 **Outros**

---

## 🔒 Segurança

### 🛡️ **Dados Locais**
- Armazenados apenas no seu computador
- Sem acesso externo
- Backup manual recomendado

### 🛡️ **Dados Supabase**
- Criptografia em trânsito (HTTPS)
- Acesso controlado por chaves
- **NUNCA** commite arquivos `.env.local`

### ⚠️ **Importante**
- **NÃO** compartilhe suas chaves do Supabase
- **NÃO** commite o arquivo `.env.local` no Git
- Faça backup regularmente

---

## 🎯 Fluxo de Trabalho Recomendado

### 📅 **Mensal**
1. Acesse o **Dashboard**
2. Navegue para o mês desejado
3. Registre todas as mensalidades
4. Registre despesas (quadra, material, etc.)

### 📊 **Semanal**
1. Marque pagamentos recebidos como "Pago"
2. Verifique pendências na lista
3. Exporte relatório se necessário

### 💾 **Backup**
1. Faça backup mensalmente
2. Armazene em local seguro
3. Teste a restauração ocasionalmente

---

## 🚀 Próximos Passos

Após a instalação:
1. ✅ Configure o banco (local ou Supabase)
2. ✅ Cadastre os atletas do time
3. ✅ Registre as mensalidades do mês
4. ✅ Teste a função "Marcar como Pago"
5. ✅ Explore o calendário e relatórios
6. ✅ Configure backup automático

---

## 📞 Suporte

Se encontrar problemas:
1. 📖 Consulte este README
2. 🔍 Verifique a seção "Solução de Problemas"
3. 🗂️ Verifique os logs no console do navegador
4. 💾 Faça backup antes de tentar correções

---

## 📄 Licença

Este projeto foi desenvolvido para uso interno de times de vôlei.

---

**🏐 Despesas Vero - Gerencie as finanças do Vero Volei com facilidade!**

*Desenvolvido com ❤️ para a comunidade do vôlei*
