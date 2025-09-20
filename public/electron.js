const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Database = require('better-sqlite3');
const fs = require('fs');
const os = require('os');

let mainWindow;
let db;

// Configurar diretório de dados do app
const getAppDataPath = () => {
  const platform = os.platform();
  let appDataPath;
  
  if (platform === 'win32') {
    appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'TeamTreasury');
  } else if (platform === 'darwin') {
    appDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'TeamTreasury');
  } else {
    appDataPath = path.join(os.homedir(), '.local', 'share', 'team_treasury');
  }
  
  // Criar diretório se não existir
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }
  
  return appDataPath;
};

const initDatabase = () => {
  const appDataPath = getAppDataPath();
  const dbPath = path.join(appDataPath, 'team_treasury.db');
  
  db = new Database(dbPath);
  
  // Criar tabelas se não existirem
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
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'favicon.ico'),
    show: false
  });

  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
    
  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Menu personalizado
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Backup',
          click: () => {
            mainWindow.webContents.send('trigger-backup');
          }
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers para comunicação com o frontend
ipcMain.handle('db-query', async (event, sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.all(params);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-run', async (event, sql, params = []) => {
  try {
    const stmt = db.prepare(sql);
    const result = stmt.run(params);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) db.close();
});
