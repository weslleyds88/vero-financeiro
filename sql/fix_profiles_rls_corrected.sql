-- ============================================
-- POLÍTICAS RLS PARA A TABELA profiles (CORRIGIDO)
-- Versão corrigida que evita recursão e permite login
-- ============================================

-- Habilitar RLS na tabela profiles (se ainda não estiver habilitado)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;

-- Remover função antiga se existir
DROP FUNCTION IF EXISTS public.is_admin();

-- Criar função de segurança que bypassa RLS para verificar role
-- Isso evita recursão nas políticas
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  -- Buscar role diretamente, bypassando RLS com SECURITY DEFINER
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role = 'admin';
END;
$$;

-- Política 1: Usuários podem ver seus próprios perfis (sempre permitido)
CREATE POLICY "Usuários podem ver seus próprios perfis"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

-- Política 2: Admins podem ver todos os perfis
-- Usa a função is_admin() que bypassa RLS para evitar recursão
CREATE POLICY "Admins podem ver todos os perfis"
ON profiles
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

-- Política 3: Usuários podem atualizar seus próprios perfis (exceto role)
CREATE POLICY "Usuários podem atualizar seus próprios perfis"
ON profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
  -- Não permitir que usuários alterem seu próprio role
  AND (
    role IS NULL 
    OR role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  )
);

-- Política 4: Admins podem atualizar qualquer perfil (incluindo role)
CREATE POLICY "Admins podem atualizar perfis"
ON profiles
FOR UPDATE
TO authenticated
USING (
  public.is_admin() OR id = auth.uid()
)
WITH CHECK (
  public.is_admin() OR id = auth.uid()
);

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Testar função
SELECT 
  auth.uid() as current_user_id,
  public.is_admin() as is_admin_result;

