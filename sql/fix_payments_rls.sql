-- ============================================
-- POLÍTICAS RLS PARA A TABELA payments
-- Permite que usuários vejam seus próprios pagamentos
-- Permite que admins vejam todos os pagamentos
-- ============================================

-- Habilitar RLS na tabela payments (se ainda não estiver habilitado)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários podem ver seus próprios pagamentos" ON payments;
DROP POLICY IF EXISTS "Admins podem ver todos os pagamentos" ON payments;
DROP POLICY IF EXISTS "Admins podem criar pagamentos" ON payments;
DROP POLICY IF EXISTS "Admins podem atualizar pagamentos" ON payments;
DROP POLICY IF EXISTS "Admins podem deletar pagamentos" ON payments;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios pagamentos" ON payments;

-- Política: Usuários podem ver seus próprios pagamentos
CREATE POLICY "Usuários podem ver seus próprios pagamentos"
ON payments
FOR SELECT
TO authenticated
USING (
  member_id = auth.uid()
);

-- Política: Admins podem ver todos os pagamentos
CREATE POLICY "Admins podem ver todos os pagamentos"
ON payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Admins podem criar pagamentos
CREATE POLICY "Admins podem criar pagamentos"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Admins podem atualizar pagamentos
CREATE POLICY "Admins podem atualizar pagamentos"
ON payments
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

-- Política: Usuários podem atualizar seus próprios pagamentos (para marcar como pago, etc)
CREATE POLICY "Usuários podem atualizar seus próprios pagamentos"
ON payments
FOR UPDATE
TO authenticated
USING (
  member_id = auth.uid()
)
WITH CHECK (
  member_id = auth.uid()
);

-- Política: Admins podem deletar pagamentos
CREATE POLICY "Admins podem deletar pagamentos"
ON payments
FOR DELETE
TO authenticated
USING (
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
WHERE tablename = 'payments'
ORDER BY policyname;

