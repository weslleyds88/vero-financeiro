-- ============================================
-- CORRIGIR SCHEMA DA TABELA payments
-- Alterar member_id de INTEGER para UUID
-- Inclui tratamento para view member_stats
-- ============================================

-- ATENÇÃO: Este script altera o tipo da coluna member_id
-- Se você tiver dados existentes, eles podem ser perdidos
-- Faça backup antes se necessário!

-- 1. Dropar a view member_stats temporariamente (se existir)
-- Isso permite alterar o tipo da coluna member_id
DROP VIEW IF EXISTS member_stats CASCADE;

-- 2. Remover constraints e índices relacionados
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_member_id_fkey;
DROP INDEX IF EXISTS idx_payments_member_id;

-- 3. Alterar tipo da coluna member_id para UUID
DO $$ 
BEGIN
  -- Verificar se a coluna existe e qual é o tipo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND column_name = 'member_id'
    AND data_type = 'integer'
  ) THEN
    -- Se for INTEGER, alterar para UUID
    ALTER TABLE payments 
    ALTER COLUMN member_id TYPE UUID USING NULL;
    
    RAISE NOTICE 'Coluna member_id alterada de INTEGER para UUID';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND column_name = 'member_id'
    AND data_type = 'uuid'
  ) THEN
    RAISE NOTICE 'Coluna member_id já é UUID, nenhuma alteração necessária';
  ELSE
    RAISE NOTICE 'Coluna member_id não encontrada ou tipo desconhecido';
  END IF;
END $$;

-- 4. Recriar índice para member_id
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);

-- 5. Verificar/criar coluna group_id como UUID
DO $$ 
BEGIN
  -- Se group_id não existe, criar como UUID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN group_id UUID;
    RAISE NOTICE 'Coluna group_id criada como UUID';
  ELSE
    -- Se já existe, verificar se é UUID
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name = 'group_id' 
      AND data_type != 'uuid'
    ) THEN
      ALTER TABLE payments 
      ALTER COLUMN group_id TYPE UUID USING group_id::text::UUID;
      RAISE NOTICE 'Coluna group_id alterada para UUID';
    ELSE
      RAISE NOTICE 'Coluna group_id já é UUID';
    END IF;
  END IF;
  
  -- Criar índice para group_id
  CREATE INDEX IF NOT EXISTS idx_payments_group_id ON payments(group_id);
END $$;

-- 6. Recriar a view member_stats com o tipo correto (UUID)
-- Versão atualizada para trabalhar com UUID em vez de INTEGER
CREATE OR REPLACE VIEW member_stats AS
SELECT 
  p.member_id,
  COUNT(*) FILTER (WHERE p.status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE p.status = 'paid') as paid_count,
  COUNT(*) FILTER (WHERE p.status = 'expense') as expense_count,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'pending'), 0) as pending_total,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0) as paid_total,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'expense'), 0) as expense_total,
  COUNT(*) as total_count,
  COALESCE(SUM(p.amount), 0) as total_amount
FROM payments p
WHERE p.member_id IS NOT NULL
GROUP BY p.member_id;

-- 7. Verificar resultado final
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('member_id', 'group_id')
ORDER BY column_name;

-- Verificar se a view foi recriada
SELECT 
  table_name,
  view_definition
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'member_stats';
