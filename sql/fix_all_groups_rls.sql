-- ============================================
-- POLÍTICAS RLS PARA GRUPOS E MEMBROS
-- Execute este arquivo para corrigir todos os problemas de RLS relacionados a grupos
-- ============================================

-- ============================================
-- 1. POLÍTICAS PARA user_groups
-- ============================================

-- Habilitar RLS na tabela user_groups (se ainda não estiver habilitado)
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Admins podem criar grupos" ON user_groups;
DROP POLICY IF EXISTS "Admins podem ler grupos" ON user_groups;
DROP POLICY IF EXISTS "Admins podem atualizar grupos" ON user_groups;
DROP POLICY IF EXISTS "Admins podem deletar grupos" ON user_groups;
DROP POLICY IF EXISTS "Usuários podem ler grupos" ON user_groups;

-- Política: Admins podem criar grupos
CREATE POLICY "Admins podem criar grupos"
ON user_groups
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Admins podem ler todos os grupos
CREATE POLICY "Admins podem ler grupos"
ON user_groups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Admins podem atualizar grupos
CREATE POLICY "Admins podem atualizar grupos"
ON user_groups
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

-- Política: Admins podem deletar grupos
CREATE POLICY "Admins podem deletar grupos"
ON user_groups
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Usuários autenticados podem ler grupos (para ver grupos disponíveis)
CREATE POLICY "Usuários podem ler grupos"
ON user_groups
FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 2. POLÍTICAS PARA user_group_members
-- ============================================

-- Habilitar RLS na tabela user_group_members (se ainda não estiver habilitado)
ALTER TABLE user_group_members ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Admins podem adicionar membros a grupos" ON user_group_members;
DROP POLICY IF EXISTS "Admins podem ler membros de grupos" ON user_group_members;
DROP POLICY IF EXISTS "Admins podem remover membros de grupos" ON user_group_members;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios grupos" ON user_group_members;

-- Política: Admins podem adicionar membros a grupos
CREATE POLICY "Admins podem adicionar membros a grupos"
ON user_group_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Admins podem ler todos os membros de grupos
CREATE POLICY "Admins podem ler membros de grupos"
ON user_group_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Admins podem remover membros de grupos
CREATE POLICY "Admins podem remover membros de grupos"
ON user_group_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Usuários podem ver seus próprios grupos (para ver em quais grupos estão)
CREATE POLICY "Usuários podem ver seus próprios grupos"
ON user_group_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

