-- ============================================
-- POLÍTICAS RLS PARA A TABELA payment_tickets
-- Permite que admins criem tickets ao aprovar pagamentos
-- Permite que usuários vejam seus próprios tickets
-- Permite que admins vejam todos os tickets
-- ============================================

-- Habilitar RLS na tabela payment_tickets (se ainda não estiver habilitado)
ALTER TABLE payment_tickets ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem (tanto em português quanto em inglês)
DROP POLICY IF EXISTS "Admins podem criar tickets" ON payment_tickets;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios tickets" ON payment_tickets;
DROP POLICY IF EXISTS "Admins podem ver todos os tickets" ON payment_tickets;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios tickets (função)" ON payment_tickets;
DROP POLICY IF EXISTS "Admins podem ver todos os tickets (função)" ON payment_tickets;
-- Remover políticas antigas em inglês
DROP POLICY IF EXISTS "Admins can view all tickets" ON payment_tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON payment_tickets;
DROP POLICY IF EXISTS "Admins can create tickets" ON payment_tickets;

-- Verificar se a função is_admin() existe, se não existir, criar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    -- Criar função que verifica se usuário é admin
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
  END IF;
END $$;

-- Política 1: Admins podem criar tickets (INSERT)
-- Esta é a política mais importante - permite que admins criem tickets ao aprovar pagamentos
CREATE POLICY "Admins podem criar tickets"
ON payment_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin() = true
);

-- Política 2: Usuários podem ver seus próprios tickets (SELECT)
CREATE POLICY "Usuários podem ver seus próprios tickets"
ON payment_tickets
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- Política 3: Admins podem ver todos os tickets (SELECT)
CREATE POLICY "Admins podem ver todos os tickets"
ON payment_tickets
FOR SELECT
TO authenticated
USING (
  public.is_admin() = true
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
WHERE tablename = 'payment_tickets'
ORDER BY policyname;

