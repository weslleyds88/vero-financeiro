-- ============================================
-- CORRIGIR SCHEMA DA TABELA payments
-- Alterar member_id de INTEGER para UUID
-- ============================================

-- ATENÇÃO: Este script altera o tipo da coluna member_id
-- Se você tiver dados existentes, eles podem ser perdidos
-- Faça backup antes se necessário!

-- 1. Verificar tipo atual da coluna member_id
-- Execute isso primeiro para ver o tipo atual:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'payments' AND column_name = 'member_id';

-- 2. Remover constraints e índices relacionados
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_member_id_fkey;
DROP INDEX IF EXISTS idx_payments_member_id;

-- 3. Alterar tipo da coluna member_id para UUID
-- Se a coluna for INTEGER, converterá valores existentes para NULL
-- Se já for UUID, não fará nada
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

-- 6. Verificar resultado final
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('member_id', 'group_id')
ORDER BY column_name;

