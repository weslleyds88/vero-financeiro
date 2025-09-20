-- ========================================
-- SCRIPT SEGURO PARA LIMPAR TABELAS
-- ========================================
-- Este script mostra os dados antes de deletar
-- e pede confirmação em cada etapa

-- ========================================
-- 1. VERIFICAR DADOS EXISTENTES
-- ========================================
-- Veja quantos registros você tem antes de deletar

SELECT 'MEMBROS/ATLETAS' as tabela, COUNT(*) as total FROM members
UNION ALL
SELECT 'PAGAMENTOS' as tabela, COUNT(*) as total FROM payments;

-- ========================================
-- 2. MOSTRAR ALGUNS REGISTROS (ÚLTIMOS 5)
-- ========================================
-- Para você ver o que será deletado

SELECT 'ÚLTIMOS ATLETAS:' as info;
SELECT id, name, phone, created_at FROM members ORDER BY created_at DESC LIMIT 5;

SELECT 'ÚLTIMOS PAGAMENTOS:' as info;
SELECT id, category, amount, status, due_date, created_at FROM payments ORDER BY created_at DESC LIMIT 5;

-- ========================================
-- 3. SE VOCÊ TEM CERTEZA, DESCOMENTE AS LINHAS ABAIXO
-- ========================================
-- Remova os -- das linhas abaixo para executar a limpeza

-- DELETAR PAGAMENTOS:
-- DELETE FROM payments;

-- DELETAR ATLETAS:
-- DELETE FROM members;

-- RESETAR CONTADORES:
-- ALTER SEQUENCE payments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE members_id_seq RESTART WITH 1;

-- ========================================
-- 4. VERIFICAÇÃO FINAL (DESCOMENTE APÓS DELETAR)
-- ========================================
-- Descomente para verificar se ficou tudo vazio

-- SELECT 'APÓS LIMPEZA:' as status;
-- SELECT 'MEMBROS' as tabela, COUNT(*) as total FROM members
-- UNION ALL
-- SELECT 'PAGAMENTOS' as tabela, COUNT(*) as total FROM payments;

-- ========================================
-- INSTRUÇÕES:
-- ========================================
-- 1. Execute primeiro as queries de verificação (linhas 11-20)
-- 2. Veja os dados que serão deletados
-- 3. Se tem certeza, descomente as linhas de DELETE (35-42)
-- 4. Execute novamente
-- 5. Descomente e execute a verificação final (47-52)
