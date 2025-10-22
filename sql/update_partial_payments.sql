-- Script para adicionar suporte a pagamentos parciais
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna paid_amount se não existir
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;

-- 2. Atualizar constraint de status para incluir 'partial'
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('pending', 'paid', 'expense', 'partial'));

-- 3. Atualizar despesas existentes para ter paid_amount = 0
UPDATE payments 
SET paid_amount = 0 
WHERE (status = 'expense' OR status = 'partial') 
  AND (paid_amount IS NULL OR paid_amount = 0);

-- 4. Atualizar pagamentos já pagos para ter paid_amount = amount
UPDATE payments 
SET paid_amount = amount 
WHERE status = 'paid' 
  AND (paid_amount IS NULL OR paid_amount = 0);

-- 5. Verificar se as alterações foram aplicadas
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default 
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND column_name IN ('paid_amount', 'status');

-- 6. Mostrar alguns registros para verificação
SELECT 
  id, 
  category, 
  amount, 
  paid_amount, 
  status, 
  created_at 
FROM payments 
ORDER BY created_at DESC 
LIMIT 10;
