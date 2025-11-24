-- Alterar coluna member_id na tabela payments de INTEGER para UUID
-- Isso é necessário porque estamos usando UUIDs do sistema de autenticação do Supabase

-- 1. Primeiro, verificar se a coluna existe e qual é o tipo atual
-- (Execute isso no SQL Editor para verificar antes de continuar)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'payments' AND column_name = 'member_id';

-- 2. Se member_id for INTEGER, precisamos alterar para UUID
-- ATENÇÃO: Isso vai remover os dados existentes em member_id se houver
-- Se você tiver dados importantes, faça backup primeiro!

-- Remover constraint de foreign key se existir
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_member_id_fkey;

-- Alterar tipo da coluna de INTEGER para UUID
-- Se a coluna já for UUID, este comando não fará nada
ALTER TABLE payments 
ALTER COLUMN member_id TYPE UUID USING 
  CASE 
    WHEN member_id::text ~ '^[0-9]+$' THEN NULL  -- Se for número, não pode converter, então NULL
    ELSE member_id::text::UUID  -- Se já for UUID em texto, converter
  END;

-- Recriar índice se necessário
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);

-- Adicionar foreign key para profiles (se necessário)
-- ALTER TABLE payments 
-- ADD CONSTRAINT payments_member_id_fkey 
-- FOREIGN KEY (member_id) REFERENCES profiles(id);

-- Verificar se group_id também precisa ser UUID
-- Se group_id não existir, criar como UUID
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN group_id UUID;
    CREATE INDEX IF NOT EXISTS idx_payments_group_id ON payments(group_id);
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
    END IF;
  END IF;
END $$;

