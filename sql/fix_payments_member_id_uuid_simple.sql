-- Alterar coluna member_id na tabela payments de INTEGER para UUID
-- Isso é necessário porque estamos usando UUIDs do sistema de autenticação do Supabase

-- ATENÇÃO: Este script vai alterar o tipo da coluna member_id de INTEGER para UUID
-- Se você tiver dados existentes em member_id como números inteiros, eles serão perdidos
-- Faça backup antes se necessário!

-- 1. Remover constraint de foreign key se existir
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_member_id_fkey;

-- 2. Alterar tipo da coluna member_id para UUID
-- Se houver dados existentes como INTEGER, eles serão convertidos para NULL
ALTER TABLE payments 
ALTER COLUMN member_id TYPE UUID USING NULL;

-- 3. Recriar índice
DROP INDEX IF EXISTS idx_payments_member_id;
CREATE INDEX idx_payments_member_id ON payments(member_id);

-- 4. Verificar/criar coluna group_id como UUID
DO $$ 
BEGIN
  -- Se group_id não existe, criar
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN group_id UUID;
  END IF;
  
  -- Criar índice para group_id
  CREATE INDEX IF NOT EXISTS idx_payments_group_id ON payments(group_id);
END $$;

-- 5. Adicionar foreign key para profiles (opcional, mas recomendado)
-- ALTER TABLE payments 
-- ADD CONSTRAINT payments_member_id_fkey 
-- FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Verificar resultado
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN ('member_id', 'group_id')
ORDER BY column_name;

