const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis do .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Script para configurar o banco Supabase
// Execute: node scripts/setup-supabase.js

const setupSupabase = async () => {
  try {
    console.log('🚀 Configurando banco Supabase...\n');
    
    // Verificar se as variáveis de ambiente estão configuradas
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
    const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('❌ Variáveis de ambiente não configuradas!');
      console.log('\n📋 Para configurar:');
      console.log('1. Copie o arquivo .env.example para .env.local');
      console.log('2. Acesse https://supabase.com/dashboard');
      console.log('3. Selecione seu projeto');
      console.log('4. Vá em Settings > API');
      console.log('5. Configure as variáveis:');
      console.log('   - REACT_APP_SUPABASE_URL=sua-url-aqui');
      console.log('   - REACT_APP_SUPABASE_ANON_KEY=sua-chave-aqui');
      console.log('\n⚠️  NUNCA commite o arquivo .env.local no Git!');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Testar conexão
    console.log('🔍 Testando conexão...');
    const { data, error } = await supabase.from('members').select('count').limit(1);
    
    if (error && error.code === '42P01') {
      console.log('📋 Tabelas não encontradas. Criando estrutura...');
      await createTables(supabase);
    } else if (error) {
      console.error('❌ Erro de conexão:', error.message);
      return;
    } else {
      console.log('✅ Conexão estabelecida com sucesso!');
    }
    
    // Verificar se há dados
    const { data: members } = await supabase.from('members').select('id').limit(1);
    const { data: payments } = await supabase.from('payments').select('id').limit(1);
    
    if (!members?.length && !payments?.length) {
      console.log('📊 Inserindo dados de exemplo...');
      await insertSampleData(supabase);
    }
    
    console.log('\n🎉 Configuração do Supabase concluída!');
    console.log('✅ Você pode agora executar: npm start');
    
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error.message);
  }
};

const createTables = async (supabase) => {
  // Ler schema SQL
  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Executar schema (nota: isso requer service role key)
  console.log('⚠️  Para criar as tabelas, execute o SQL do arquivo sql/schema.sql');
  console.log('   diretamente no SQL Editor do Supabase Dashboard.');
};

const insertSampleData = async (supabase) => {
  // Carregar dados de exemplo
  const mocksPath = path.join(__dirname, '..', 'seeds', 'mocks.json');
  const mocks = JSON.parse(fs.readFileSync(mocksPath, 'utf8'));
  
  try {
    // Inserir sócios
    const { error: membersError } = await supabase
      .from('members')
      .insert(mocks.members.map(m => ({
        name: m.name,
        phone: m.phone,
        observation: m.observation
      })));
    
    if (membersError) throw membersError;
    
    // Inserir pagamentos
    const { error: paymentsError } = await supabase
      .from('payments')
      .insert(mocks.payments.map(p => ({
        member_id: p.member_id,
        amount: p.amount,
        category: p.category,
        observation: p.observation,
        due_date: p.due_date,
        paid_at: p.paid_at,
        status: p.status
      })));
    
    if (paymentsError) throw paymentsError;
    
    console.log('✅ Dados de exemplo inseridos com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inserir dados de exemplo:', error.message);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  setupSupabase();
}

module.exports = { setupSupabase };
