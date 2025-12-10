-- ============================================
-- LIMPEZA DE POLÍTICAS DUPLICADAS payment_tickets
-- Remove políticas antigas em inglês e mantém apenas as novas em português
-- ============================================

-- Remover políticas antigas em inglês
DROP POLICY IF EXISTS "Admins can view all tickets" ON payment_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON payment_tickets;
DROP POLICY IF EXISTS "Admins can create tickets" ON payment_tickets;

-- Verificar políticas restantes
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
WHERE tablename = 'payment_tickets'
ORDER BY policyname;

