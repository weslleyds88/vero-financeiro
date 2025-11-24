-- ============================================
-- POLÍTICAS RLS FINAIS PARA profiles (SEM RECURSÃO)
-- Execute este script DEPOIS de conseguir fazer login novamente
-- ============================================

-- PASSO 1: Remover políticas antigas problemáticas
DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Permitir leitura do próprio perfil para login" ON profiles;

-- PASSO 2: Remover função antiga se existir
DROP FUNCTION IF EXISTS public.is_admin();

-- PASSO 3: Criar função que verifica se usuário é admin
-- Esta função usa SECURITY DEFINER para bypassar RLS e evitar recursão
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin',
    false
  );
$$;

-- PASSO 4: Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- PASSO 5: Política 1 - Usuários podem SEMPRE ver seus próprios perfis
-- Esta é a política mais importante - permite login funcionar
CREATE POLICY "Usuários podem ver seus próprios perfis"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

-- PASSO 6: Política 2 - Admins podem ver todos os perfis
-- Usa a função is_admin() que bypassa RLS
CREATE POLICY "Admins podem ver todos os perfis"
ON profiles
FOR SELECT
TO authenticated
USING (
  public.is_admin() = true
);

-- PASSO 7: Política 3 - Usuários podem atualizar seus próprios perfis
-- Simplificada para evitar recursão - a restrição de role será feita no código da aplicação
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

-- PASSO 8: Política 4 - Admins podem atualizar qualquer perfil
CREATE POLICY "Admins podem atualizar perfis"
ON profiles
FOR UPDATE
TO authenticated
USING (
  public.is_admin() = true OR id = auth.uid()
)
WITH CHECK (
  public.is_admin() = true OR id = auth.uid()
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

-- Testar se a função funciona
SELECT 
  auth.uid() as current_user_id,
  public.is_admin() as is_admin_result;

