-- ========================================
-- LIMPAR APENAS OS DADOS DAS TABELAS
-- ========================================
-- Mantém a estrutura das tabelas, remove apenas os registros
-- Ideal para entregar o aplicativo limpo para o cliente

-- ========================================
-- 1. VERIFICAR QUANTOS REGISTROS EXISTEM
-- ========================================
SELECT 'Antes da limpeza:' as status;
SELECT 'Atletas' as tabela, COUNT(*) as registros FROM members
UNION ALL
SELECT 'Pagamentos' as tabela, COUNT(*) as registros FROM payments;

-- ========================================
-- 2. LIMPAR OS DADOS (MANTER ESTRUTURA)
-- ========================================
-- Remove todos os registros mas mantém as tabelas

-- Limpar pagamentos (receitas, despesas, mensalidades)
DELETE FROM payments;

-- Limpar atletas cadastrados
DELETE FROM members;

-- ========================================
-- 3. RESETAR CONTADORES PARA COMEÇAR DO ID 1
-- ========================================
-- Próximos registros terão ID = 1, 2, 3...

ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE members_id_seq RESTART WITH 1;

-- ========================================
-- 4. VERIFICAR SE FICOU LIMPO
-- ========================================
SELECT 'Após a limpeza:' as status;
SELECT 'Atletas' as tabela, COUNT(*) as registros FROM members
UNION ALL
SELECT 'Pagamentos' as tabela, COUNT(*) as registros FROM payments;

-- ========================================
-- 5. CONFIRMAR ESTRUTURA DAS TABELAS
-- ========================================
-- Verifica que as tabelas ainda existem, apenas vazias
SELECT 'Estrutura mantida - Tabelas existem:' as confirmacao;
SELECT table_name as tabela_existente 
FROM information_schema.tables 
WHERE table_name IN ('members', 'payments') 
AND table_schema = 'public';

-- ========================================
-- RESULTADO ESPERADO:
-- ========================================
-- ✅ Antes: Atletas = X, Pagamentos = Y
-- ✅ Após: Atletas = 0, Pagamentos = 0  
-- ✅ Tabelas existem: members, payments
-- ✅ Próximo ID será 1 para ambas tabelas
-- ✅ Aplicativo pronto para entrega!
