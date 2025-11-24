-- ============================================
-- POLÍTICAS RLS PARA A TABELA notifications
-- Permite que admins criem notificações
-- Permite que usuários vejam suas próprias notificações
-- Permite que usuários marquem suas notificações como lidas
-- ============================================

-- Habilitar RLS na tabela notifications (se ainda não estiver habilitado)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Admins podem criar notificações" ON notifications;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias notificações" ON notifications;
DROP POLICY IF EXISTS "Admins podem ver todas as notificações" ON notifications;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias notificações" ON notifications;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias notificações" ON notifications;

-- Política: Admins podem criar notificações (para qualquer usuário)
CREATE POLICY "Admins podem criar notificações"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Usuários podem criar notificações para si mesmos
-- (útil quando o próprio usuário faz uma ação e quer uma confirmação)
CREATE POLICY "Usuários podem criar notificações para si mesmos"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- Política: Usuários podem ver suas próprias notificações
CREATE POLICY "Usuários podem ver suas próprias notificações"
ON notifications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Política: Admins podem ver todas as notificações
CREATE POLICY "Admins podem ver todas as notificações"
ON notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Usuários podem atualizar suas próprias notificações (para marcar como lida)
CREATE POLICY "Usuários podem atualizar suas próprias notificações"
ON notifications
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);

-- Política: Usuários podem deletar suas próprias notificações
CREATE POLICY "Usuários podem deletar suas próprias notificações"
ON notifications
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
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
WHERE tablename = 'notifications'
ORDER BY policyname;

