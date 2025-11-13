const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { getAppDataPath } = require('./init-local-db');

const seedDatabase = () => {
  try {
    // Carregar dados de mock
    const mocksPath = path.join(__dirname, '..', 'seeds', 'mocks.json');
    const mocksData = JSON.parse(fs.readFileSync(mocksPath, 'utf8'));
    
    // Conectar ao banco
    const appDataPath = getAppDataPath();
    const dbPath = path.join(appDataPath, 'despesas_vero.db');
    
    if (!fs.existsSync(dbPath)) {
      console.error('Banco de dados não encontrado. Execute primeiro: npm run init-db');
      process.exit(1);
    }
    
    const db = new Database(dbPath);
    
    console.log('Inserindo dados de exemplo...');
    
    // Limpar dados existentes (opcional)
    const clearData = process.argv.includes('--clear');
    if (clearData) {
      console.log('Limpando dados existentes...');
      db.exec('DELETE FROM payments');
      db.exec('DELETE FROM members');
      db.exec('DELETE FROM sqlite_sequence WHERE name IN ("members", "payments")');
    }
    
    // Inserir sócios
    const insertMember = db.prepare(`
      INSERT INTO members (id, name, phone, observation, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    console.log(`Inserindo ${mocksData.members.length} sócios...`);
    for (const member of mocksData.members) {
      insertMember.run(
        member.id,
        member.name,
        member.phone,
        member.observation,
        member.created_at,
        member.updated_at
      );
    }
    
    // Inserir pagamentos
    const insertPayment = db.prepare(`
      INSERT INTO payments (id, member_id, amount, category, observation, due_date, paid_at, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    console.log(`Inserindo ${mocksData.payments.length} pagamentos...`);
    for (const payment of mocksData.payments) {
      insertPayment.run(
        payment.id,
        payment.member_id,
        payment.amount,
        payment.category,
        payment.observation,
        payment.due_date,
        payment.paid_at,
        payment.status,
        payment.created_at,
        payment.updated_at
      );
    }
    
    // Verificar dados inseridos
    const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get();
    const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payments').get();
    
    console.log('Dados inseridos com sucesso!');
    console.log(`- Sócios: ${memberCount.count}`);
    console.log(`- Pagamentos: ${paymentCount.count}`);
    
    db.close();
    
  } catch (error) {
    console.error('Erro ao inserir dados de exemplo:', error);
    process.exit(1);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
