# 🧪 Teste Manual - Despesas Vero

## ✅ Checklist de Funcionalidades

### 🚀 **Configuração Inicial**
- [ ] Projeto instalado com `npm install`
- [ ] Arquivo `.env.local` configurado
- [ ] Banco configurado (local ou Supabase)
- [ ] App executando com `npm start`

---

### 👥 **Gestão de Atletas**

#### ➕ Adicionar Atleta
- [ ] Ir em "Atletas" → "Novo Atleta"
- [ ] Preencher: Nome, Telefone, Observação
- [ ] Clicar "Adicionar"
- [ ] ✅ Atleta aparece na lista

#### 🔍 Buscar Sócio
- [ ] Digitar nome na barra de busca
- [ ] ✅ Lista filtra em tempo real

#### ✏️ Editar Sócio
- [ ] Clicar no ícone de editar (lápis)
- [ ] Alterar informações
- [ ] Clicar "Atualizar"
- [ ] ✅ Alterações salvas

#### 🗑️ Excluir Sócio
- [ ] Clicar no ícone de excluir (lixeira)
- [ ] Confirmar exclusão
- [ ] ✅ Sócio removido da lista

---

### 💳 **Gestão de Pagamentos**

#### ➕ Adicionar Receita (Pendente)
- [ ] Ir em "Pagamentos" → "Novo Pagamento"
- [ ] Tipo: "Receita (Pendente)"
- [ ] Selecionar sócio
- [ ] Preencher valor, categoria, data
- [ ] Clicar "Adicionar"
- [ ] ✅ Pagamento aparece com status "Pendente"

#### ➕ Adicionar Receita (Paga)
- [ ] Novo pagamento
- [ ] Marcar "Marcar como pago imediatamente"
- [ ] ✅ Pagamento aparece com status "Pago"

#### ➕ Adicionar Despesa
- [ ] Novo pagamento
- [ ] Tipo: "Despesa"
- [ ] Preencher informações
- [ ] ✅ Pagamento aparece com status "Despesa"

#### ⚡ **Marcar como Pago (Individual)**
- [ ] Na lista, clicar no ✅ de um pagamento pendente
- [ ] ✅ Status muda para "Pago" instantaneamente
- [ ] ✅ Data de pagamento é preenchida automaticamente

#### ⚡ **Marcar como Pago (Múltiplos)**
- [ ] Selecionar checkbox de vários pagamentos pendentes
- [ ] Clicar "Marcar selecionados como Pago"
- [ ] ✅ Todos os selecionados ficam "Pago"

#### 🔍 Filtros
- [ ] Filtrar por mês (navegação anterior/próximo)
- [ ] Filtrar por sócio
- [ ] Filtrar por status
- [ ] Filtrar por categoria
- [ ] ✅ Lista atualiza conforme filtros

---

### 📊 **Dashboard**

#### 📈 Estatísticas
- [ ] Total de sócios correto
- [ ] Total de receitas do mês
- [ ] Total de despesas do mês
- [ ] Quantidade de pendentes
- [ ] Quantidade de pagos
- [ ] ✅ Saldo final (receitas - despesas)

#### 📅 Navegação de Mês
- [ ] Clicar setas para navegar meses
- [ ] ✅ Estatísticas atualizam por mês

#### 🔗 Links Rápidos
- [ ] Clicar "Novo Pagamento" → vai para formulário
- [ ] Clicar "Novo Sócio" → vai para formulário
- [ ] Clicar "Ver Calendário" → vai para calendário

---

### 📅 **Calendário**

#### 📊 Visualização Mensal
- [ ] Navegar entre meses
- [ ] ✅ Dias com movimentos destacados
- [ ] ✅ Cores diferentes para saldo positivo/negativo

#### 📋 Detalhes do Dia
- [ ] Clicar em um dia com movimentos
- [ ] ✅ Modal abre com lista de pagamentos
- [ ] ✅ Resumo do dia (receitas, despesas, saldo)

#### 📈 Resumo Mensal
- [ ] ✅ Cards com estatísticas do mês
- [ ] ✅ Valores batem com os do Dashboard

---

### 👤 **Visualização por Sócio**

#### 🔍 Acessar Sócio
- [ ] Na lista de sócios, clicar em um nome
- [ ] ✅ Página individual do sócio abre

#### 📊 Estatísticas do Sócio
- [ ] ✅ Total pago pelo sócio
- [ ] ✅ Total pendente
- [ ] ✅ Quantidade de pagamentos
- [ ] ✅ Data do último pagamento

#### 📋 Histórico
- [ ] ✅ Lista todos os pagamentos do sócio
- [ ] ✅ Ordenados por data (mais recente primeiro)

#### ⚡ Marcar Pago Individual
- [ ] Clicar "Marcar Pago" em um pagamento pendente
- [ ] ✅ Status atualiza imediatamente

---

### 📤 **Exportação**

#### 📊 Exportar CSV
- [ ] Clicar "Exportar" → "Sócios (CSV)"
- [ ] ✅ Arquivo baixado com dados corretos
- [ ] Clicar "Exportar" → "Pagamentos (CSV)"
- [ ] ✅ Arquivo baixado com filtros aplicados

#### 📈 Exportar Excel
- [ ] Clicar "Exportar" → "Sócios (Excel)"
- [ ] ✅ Arquivo .xlsx baixado
- [ ] Clicar "Exportar" → "Pagamentos (Excel)"
- [ ] ✅ Formatação de moeda correta

#### 💾 Backup Completo
- [ ] Clicar "Exportar" → "Backup (JSON)"
- [ ] ✅ Arquivo JSON com todos os dados
- [ ] Clicar "Exportar" → "Backup (Excel)"
- [ ] ✅ Arquivo Excel com múltiplas abas

---

### ⚙️ **Configurações**

#### 📊 Informações do Sistema
- [ ] ✅ Modo do banco exibido corretamente
- [ ] ✅ Estatísticas gerais corretas

#### 💾 Backup Manual
- [ ] Clicar "Backup JSON"
- [ ] ✅ Arquivo baixado
- [ ] Clicar "Backup Excel"
- [ ] ✅ Arquivo baixado

#### 📥 Restaurar Backup
- [ ] Selecionar arquivo JSON de backup
- [ ] Clicar "Restaurar Backup"
- [ ] Confirmar ação
- [ ] ✅ Dados restaurados corretamente

---

### 📱 **Responsividade**

#### 💻 Desktop
- [ ] ✅ Layout funciona em tela grande
- [ ] ✅ Sidebar fixa visível

#### 📱 Mobile/Tablet
- [ ] ✅ Layout se adapta a telas menores
- [ ] ✅ Tabelas com scroll horizontal
- [ ] ✅ Botões acessíveis

---

### ⚡ **Performance**

#### 🚀 Carregamento
- [ ] ✅ App carrega em menos de 3 segundos
- [ ] ✅ Transições suaves entre páginas

#### 🔄 Atualizações
- [ ] ✅ Dados atualizam em tempo real
- [ ] ✅ Sem necessidade de refresh manual

---

### 🖥️ **Electron (App Desktop)**

#### 📦 Executar como App
- [ ] `npm run electron-dev`
- [ ] ✅ App abre em janela própria
- [ ] ✅ Menu personalizado funciona

#### 🔧 Gerar Executável
- [ ] `npm run package-win`
- [ ] ✅ Arquivo .exe gerado na pasta `dist/`
- [ ] ✅ Executável funciona independentemente

---

## 🎯 **Teste de Fluxo Completo**

### Cenário: "Gestão Mensal do Time"

1. **Setup Inicial**
   - [ ] Cadastrar 5 sócios do time
   - [ ] Verificar se aparecem no Dashboard

2. **Registrar Mensalidades**
   - [ ] Criar mensalidade para cada sócio (R$ 150,00)
   - [ ] Definir vencimento para fim do mês
   - [ ] ✅ Todos aparecem como "Pendente"

3. **Registrar Despesas**
   - [ ] Adicionar despesa: Aluguel da quadra (R$ 500,00)
   - [ ] Adicionar despesa: Material esportivo (R$ 200,00)
   - [ ] ✅ Aparecem como "Despesa"

4. **Receber Pagamentos**
   - [ ] Marcar 3 mensalidades como pagas
   - [ ] ✅ Status atualiza, saldo muda

5. **Verificar Relatórios**
   - [ ] Dashboard: Saldo = (3 × R$ 150) - R$ 700 = -R$ 250
   - [ ] Calendário: Dias com movimentos destacados
   - [ ] Exportar relatório mensal

6. **Backup e Segurança**
   - [ ] Fazer backup completo
   - [ ] Testar restauração em ambiente limpo

---

## ✅ **Critérios de Sucesso**

- [ ] **Funcionalidade Principal**: Marcar pagamentos como "Pago" funciona perfeitamente
- [ ] **Usabilidade**: Interface intuitiva, não precisa de manual
- [ ] **Performance**: Resposta rápida em todas as ações
- [ ] **Confiabilidade**: Dados não se perdem, backup funciona
- [ ] **Completude**: Todas as funcionalidades prometidas funcionam

---

## 🚨 **Problemas Encontrados**

### 🐛 Bug Report Template:
```
**Problema**: [Descreva o que aconteceu]
**Esperado**: [O que deveria acontecer]
**Passos**: [Como reproduzir]
**Tela**: [Qual componente/página]
**Erro**: [Mensagem de erro, se houver]
```

---

**🎯 Objetivo: 100% dos testes passando = Sistema pronto para uso!**
