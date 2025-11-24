-- ============================================
-- POLÍTICAS RLS PARA A TABELA profiles
-- Permite que admins atualizem perfis (incluindo role)
-- Permite que usuários atualizem seus próprios perfis (exceto role)
-- ============================================

-- Habilitar RLS na tabela profiles (se ainda não estiver habilitado)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Admins podem atualizar perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;

-- Política: Usuários podem ver seus próprios perfis
CREATE POLICY "Usuários podem ver seus próprios perfis"
ON profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

-- Política: Admins podem ver todos os perfis
CREATE POLICY "Admins podem ver todos os perfis"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Usuários podem atualizar seus próprios perfis (exceto role)
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
  AND (role IS NULL OR role = (SELECT role FROM profiles WHERE id = auth.uid()))
);

-- Política: Admins podem atualizar qualquer perfil (incluindo role)
CREATE POLICY "Admins podem atualizar perfis"
ON profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
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

