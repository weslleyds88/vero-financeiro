-- Schema para PostgreSQL/Supabase
-- Team Treasury Database Schema

-- Tabela de atletas
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    observation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    category VARCHAR(100) NOT NULL,
    observation TEXT,
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expense', 'partial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_category ON payments(category);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- View para resumo mensal
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
    DATE_TRUNC('month', due_date) as month,
    DATE(due_date) as day,
    SUM(CASE WHEN status != 'expense' THEN amount ELSE 0 END) as total_income,
    SUM(CASE WHEN status = 'expense' THEN amount ELSE 0 END) as total_expenses,
    SUM(CASE WHEN status != 'expense' THEN amount ELSE -amount END) as net_balance,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'expense' THEN 1 END) as expense_count
FROM payments 
WHERE due_date IS NOT NULL
GROUP BY DATE_TRUNC('month', due_date), DATE(due_date)
ORDER BY month DESC, day DESC;

-- View para estatísticas por atleta
CREATE OR REPLACE VIEW member_stats AS
SELECT 
    m.id,
    m.name,
    COUNT(p.id) as total_payments,
    SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END) as total_paid,
    SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END) as total_pending,
    COUNT(CASE WHEN p.status = 'paid' THEN 1 END) as paid_count,
    COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_count,
    MAX(p.paid_at) as last_payment_date
FROM members m
LEFT JOIN payments p ON m.id = p.member_id AND p.status != 'expense'
GROUP BY m.id, m.name
ORDER BY m.name;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger nas tabelas
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at 
    BEFORE UPDATE ON members 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para marcar pagamento como pago
CREATE OR REPLACE FUNCTION mark_payment_paid(payment_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE payments 
    SET paid_at = NOW(), 
        status = 'paid', 
        updated_at = NOW()
    WHERE id = payment_id AND status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para marcar múltiplos pagamentos como pagos
CREATE OR REPLACE FUNCTION mark_payments_paid(payment_ids INTEGER[])
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE payments 
    SET paid_at = NOW(), 
        status = 'paid', 
        updated_at = NOW()
    WHERE id = ANY(payment_ids) AND status = 'pending';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas tabelas
COMMENT ON TABLE members IS 'Tabela de atletas do time';
COMMENT ON TABLE payments IS 'Tabela de pagamentos e despesas';
COMMENT ON VIEW monthly_summary IS 'Resumo mensal de receitas e despesas';
COMMENT ON VIEW member_stats IS 'Estatísticas por atleta';

-- Comentários nas colunas
COMMENT ON COLUMN members.name IS 'Nome completo do atleta';
COMMENT ON COLUMN members.phone IS 'Telefone de contato';
COMMENT ON COLUMN members.observation IS 'Observações sobre o atleta';

COMMENT ON COLUMN payments.member_id IS 'ID do atleta (NULL para despesas gerais)';
COMMENT ON COLUMN payments.amount IS 'Valor do pagamento ou despesa';
COMMENT ON COLUMN payments.category IS 'Categoria do pagamento (ex: mensalidade, uniforme, etc.)';
COMMENT ON COLUMN payments.observation IS 'Observações sobre o pagamento';
COMMENT ON COLUMN payments.due_date IS 'Data de vencimento';
COMMENT ON COLUMN payments.paid_at IS 'Data e hora do pagamento';
COMMENT ON COLUMN payments.status IS 'Status: pending (pendente), paid (pago), expense (despesa)';

-- Inserir dados iniciais se necessário
-- (Será feito via script de seed)
