-- ========================================
-- SCRIPT PARA LIMPAR TODAS AS TABELAS
-- ========================================
-- ATENÇÃO: Este script irá DELETAR TODOS os dados das tabelas!
-- Use apenas para testes ou quando quiser começar do zero.
-- Esta ação NÃO PODE SER DESFEITA!

-- ========================================
-- 1. DESABILITAR VERIFICAÇÕES DE CHAVE ESTRANGEIRA (TEMPORARIAMENTE)
-- ========================================
-- Isso permite deletar dados mesmo com relacionamentos

-- ========================================
-- 2. LIMPAR TABELA DE PAGAMENTOS
-- ========================================
-- Remove todos os pagamentos, despesas e receitas
DELETE FROM payments;

-- ========================================
-- 3. LIMPAR TABELA DE MEMBROS/ATLETAS
-- ========================================
-- Remove todos os atletas cadastrados
DELETE FROM members;

-- ========================================
-- 4. RESETAR SEQUÊNCIAS (AUTO INCREMENT)
-- ========================================
-- Faz com que os próximos IDs comecem do 1 novamente
ALTER SEQUENCE payments_id_seq RESTART WITH 1;
ALTER SEQUENCE members_id_seq RESTART WITH 1;

-- ========================================
-- 5. VERIFICAR SE AS TABELAS ESTÃO VAZIAS
-- ========================================
-- Estas queries devem retornar 0 registros cada uma

SELECT COUNT(*) as total_payments FROM payments;
SELECT COUNT(*) as total_members FROM members;

-- ========================================
-- 6. MOSTRAR ESTRUTURA DAS TABELAS (OPCIONAL)
-- ========================================
-- Para confirmar que as tabelas ainda existem, apenas vazias

SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('payments', 'members') 
ORDER BY table_name, ordinal_position;

-- ========================================
-- RESULTADO ESPERADO:
-- ========================================
-- - total_payments: 0
-- - total_members: 0
-- - Estrutura das tabelas mantida
-- - Próximos registros terão ID = 1

-- ========================================
-- PARA USAR:
-- ========================================
-- 1. Vá no Supabase Dashboard
-- 2. Clique em "SQL Editor"
-- 3. Cole este script
-- 4. Clique em "Run"
-- 5. Confirme que os COUNTs retornaram 0
