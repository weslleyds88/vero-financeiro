import React, { useState } from 'react';
import { exportBackupToXLSX } from '../utils/exportXLSX';

const Settings = ({ db, members, payments, onRefresh }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const handleBackupJSON = async () => {
    setIsExporting(true);
    try {
      const backup = await db.exportBackup();
      if (backup) {
        const dataStr = JSON.stringify(backup, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(dataBlob);
        link.setAttribute('href', url);
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        link.setAttribute('download', `backup-team-treasury-${timestamp}.json`);
        
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert('Backup exportado com sucesso!');
      } else {
        alert('Erro ao gerar backup');
      }
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      alert('Erro ao exportar backup JSON');
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackupExcel = () => {
    setIsExporting(true);
    try {
      exportBackupToXLSX(members, payments);
      alert('Backup Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar backup Excel:', error);
      alert('Erro ao exportar backup Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/json') {
      setImportFile(file);
    } else {
      alert('Por favor, selecione um arquivo JSON válido');
      e.target.value = '';
    }
  };

  const handleImportBackup = async () => {
    if (!importFile) {
      alert('Selecione um arquivo de backup primeiro');
      return;
    }

    if (!window.confirm('ATENÇÃO: Esta ação irá substituir todos os dados atuais. Tem certeza que deseja continuar?')) {
      return;
    }

    setIsImporting(true);
    try {
      const fileContent = await importFile.text();
      const backupData = JSON.parse(fileContent);
      
      // Validar estrutura do backup
      if (!backupData.data || !backupData.data.members || !backupData.data.payments) {
        throw new Error('Arquivo de backup inválido');
      }

      const success = await db.importBackup(backupData);
      
      if (success) {
        alert('Backup importado com sucesso!');
        setImportFile(null);
        document.getElementById('backup-file').value = '';
        onRefresh();
      } else {
        alert('Erro ao importar backup');
      }
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      alert('Erro ao importar backup: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const getDbMode = () => {
    return process.env.REACT_APP_DB_MODE || 'local';
  };

  const getDbInfo = () => {
    const mode = getDbMode();
    if (mode === 'supabase') {
      return {
        type: 'Supabase (Cloud)',
        description: 'Dados armazenados na nuvem',
        icon: (
          <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        )
      };
    } else {
      return {
        type: 'Local (SQLite/JSON)',
        description: 'Dados armazenados localmente',
        icon: (
          <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
      };
    }
  };

  const dbInfo = getDbInfo();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600 mt-1">Gerencie backup, importação e configurações do sistema</p>
      </div>

      {/* Informações do Sistema */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações do Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg mr-4">
              {dbInfo.icon}
            </div>
            <div>
              <p className="font-medium text-gray-900">Banco de Dados</p>
              <p className="text-sm text-gray-600">{dbInfo.type}</p>
              <p className="text-xs text-gray-500">{dbInfo.description}</p>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg mr-4">
              <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Versão</p>
              <p className="text-sm text-gray-600">Aplicativo: Despesas Vero, v1.0.0</p>
              <p className="text-xs text-gray-500">Sistema funcionando normalmente</p>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Atletas</p>
              <p className="text-2xl font-bold text-gray-900">{members.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Pagamentos</p>
              <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-danger-100 rounded-lg">
              <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Despesas</p>
              <p className="text-2xl font-bold text-gray-900">
                {payments.filter(p => p.status === 'expense').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Backup e Restauração */}
      <div className="card p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Backup e Restauração</h2>
        <p className="text-gray-600 mb-6">
          Faça backup dos seus dados regularmente para evitar perda de informações importantes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Exportar Backup */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Exportar Backup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Exporte todos os dados para um arquivo de backup.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleBackupJSON}
                disabled={isExporting}
                className="w-full btn btn-primary"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exportando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Backup JSON
                  </>
                )}
              </button>
              <button
                onClick={handleBackupExcel}
                disabled={isExporting}
                className="w-full btn btn-secondary"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Exportando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Backup Excel
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Importar Backup */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Importar Backup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Restaure dados de um arquivo de backup JSON.
            </p>
            <div className="space-y-3">
              <input
                type="file"
                id="backup-file"
                accept=".json"
                onChange={handleFileSelect}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              <button
                onClick={handleImportBackup}
                disabled={!importFile || isImporting}
                className="w-full btn btn-warning"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Restaurar Backup
                  </>
                )}
              </button>
            </div>
            <div className="mt-3 p-3 bg-warning-50 border border-warning-200 rounded-lg">
              <p className="text-xs text-warning-700">
                ⚠️ <strong>Atenção:</strong> Esta ação irá substituir todos os dados atuais.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Informações de Ajuda */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ajuda e Suporte</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Como usar o sistema</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Cadastre os atletas do time na seção "Atletas"</li>
              <li>• Registre pagamentos e despesas em "Pagamentos"</li>
              <li>• Use o calendário para visualizar movimentos mensais</li>
              <li>• Marque pagamentos como "Pago" com um clique</li>
              <li>• Exporte relatórios em CSV ou Excel</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Dicas importantes</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Faça backup regularmente dos seus dados</li>
              <li>• Use categorias consistentes para facilitar relatórios</li>
              <li>• Mantenha as informações dos atletas atualizadas</li>
              <li>• Verifique os filtros ao exportar relatórios</li>
              <li>• Use a visualização por atleta para acompanhar pendências</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
