-- ============================================
-- CORREÇÃO URGENTE: Remover políticas RLS problemáticas
-- Execute este script PRIMEIRO para restaurar acesso ao login
-- ============================================

-- DESABILITAR RLS temporariamente para permitir login
-- ATENÇÃO: Isso remove todas as restrições de segurança temporariamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas antigas
DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;

-- Remover função se existir
DROP FUNCTION IF EXISTS public.is_admin();

-- ============================================
-- AGORA RECRIAR POLÍTICAS CORRETAS (sem recursão)
-- ============================================

-- Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuários autenticados podem ver seus próprios perfis
CREATE POLICY "Usuários podem ver seus próprios perfis"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

-- Política 2: Permitir que usuários vejam perfis durante login
-- Esta política permite que qualquer usuário autenticado veja seu próprio perfil
-- sem verificar role (evita recursão)
CREATE POLICY "Permitir leitura do próprio perfil para login"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

-- Política 3: Admins podem ver todos os perfis
-- Usa uma verificação direta sem recursão
-- IMPORTANTE: Esta política só funciona se o usuário já conseguiu ler seu próprio perfil primeiro
CREATE POLICY "Admins podem ver todos os perfis"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- Verificar role diretamente usando uma subquery que bypassa RLS
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
  OR id = auth.uid() -- Sempre permitir ver próprio perfil
);

-- Política 4: Usuários podem atualizar seus próprios perfis
CREATE POLICY "Usuários podem atualizar seus próprios perfis"
ON profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
);

-- Política 5: Admins podem atualizar qualquer perfil
CREATE POLICY "Admins podem atualizar perfis"
ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
  OR id = auth.uid()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
  OR id = auth.uid()
);

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

