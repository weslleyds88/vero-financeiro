const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configurar diretório de dados do app
const getAppDataPath = () => {
  const platform = os.platform();
  let appDataPath;
  
  if (platform === 'win32') {
    appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'DespesasVero');
  } else if (platform === 'darwin') {
    appDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'DespesasVero');
  } else {
    appDataPath = path.join(os.homedir(), '.local', 'share', 'despesas_vero');
  }
  
  // Criar diretório se não existir
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }
  
  return appDataPath;
};

const initDatabase = () => {
  try {
    const appDataPath = getAppDataPath();
    const dbPath = path.join(appDataPath, 'despesas_vero.db');
    
    console.log('Inicializando banco de dados em:', dbPath);
    
    const db = new Database(dbPath);
    
    // Criar tabelas
    console.log('Criando tabelas...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        observation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER,
        amount DECIMAL(10,2) NOT NULL,
        category TEXT NOT NULL,
        observation TEXT,
        due_date DATE,
        paid_at DATETIME,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expense')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members (id)
      );

      CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments (member_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
      CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments (due_date);
      CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments (paid_at);
    `);
    
    console.log('Banco de dados inicializado com sucesso!');
    console.log('Localização:', dbPath);
    
    db.close();
    
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase, getAppDataPath };
