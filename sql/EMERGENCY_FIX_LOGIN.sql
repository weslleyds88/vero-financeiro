-- ============================================
-- CORREÇÃO DE EMERGÊNCIA - RESTAURAR LOGIN
-- Execute este script AGORA para restaurar acesso
-- ============================================

-- PASSO 1: Desabilitar RLS temporariamente para restaurar acesso
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover todas as políticas problemáticas
DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Permitir leitura do próprio perfil para login" ON profiles;

-- PASSO 3: Remover função se existir
DROP FUNCTION IF EXISTS public.is_admin();

-- ============================================
-- AGORA VOCÊ PODE FAZER LOGIN NOVAMENTE!
-- ============================================
-- 
-- Depois que conseguir fazer login, você pode executar
-- o script fix_profiles_rls_simple.sql para reabilitar
-- RLS com políticas mais seguras (mas que ainda permitem login)
-- ============================================

-- Verificar status atual
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'profiles';

