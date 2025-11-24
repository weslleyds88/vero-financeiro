-- Políticas RLS para a tabela user_groups
-- Permite que admins criem, leiam, atualizem e deletem grupos
-- Permite que usuários regulares leiam grupos

-- Habilitar RLS na tabela user_groups (se ainda não estiver habilitado)
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem (opcional, para evitar conflitos)
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

