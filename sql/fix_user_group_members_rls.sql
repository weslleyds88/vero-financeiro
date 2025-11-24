-- Políticas RLS para a tabela user_group_members
-- Permite que admins gerenciem membros de grupos
-- Permite que usuários vejam seus próprios grupos

-- Habilitar RLS na tabela user_group_members (se ainda não estiver habilitado)
ALTER TABLE user_group_members ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem (opcional, para evitar conflitos)
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

