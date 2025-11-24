-- ============================================
-- ADICIONAR FOREIGN KEY ENTRE payments E profiles
-- Isso permite que o Supabase faça joins automáticos usando a sintaxe profiles:member_id(...)
-- ============================================

-- Remover constraint antiga se existir
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_member_id_fkey;

-- Adicionar foreign key constraint
-- ON DELETE SET NULL: se um perfil for deletado, o member_id fica NULL (não deleta o pagamento)
ALTER TABLE payments 
ADD CONSTRAINT payments_member_id_fkey 
FOREIGN KEY (member_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Criar índice se não existir (melhora performance)
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);

-- Verificar constraint criada
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'payments'
  AND kcu.column_name = 'member_id';

