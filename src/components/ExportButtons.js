import React, { useState } from 'react';
import { 
  exportMembersToCSV, 
  exportPaymentsToCSV, 
  exportMonthlySummaryToCSV 
} from '../utils/exportCSV';
import { 
  exportMembersToXLSX, 
  exportPaymentsToXLSX, 
  exportMonthlySummaryToXLSX,
  exportBackupToXLSX 
} from '../utils/exportXLSX';

const ExportButtons = ({ members, payments, db, showBackup = true, currentMonth = null }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleExportCSV = (type) => {
    setIsExporting(true);
    try {
      switch (type) {
        case 'members':
          exportMembersToCSV(members);
          break;
        case 'payments':
          exportPaymentsToCSV(payments, members);
          break;
        case 'monthly':
          if (currentMonth) {
            const summaryData = generateMonthlySummary(payments, currentMonth);
            exportMonthlySummaryToCSV(summaryData, currentMonth);
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('Erro ao exportar arquivo CSV');
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  };

  const handleExportXLSX = (type) => {
    setIsExporting(true);
    try {
      switch (type) {
        case 'members':
          exportMembersToXLSX(members);
          break;
        case 'payments':
          exportPaymentsToXLSX(payments, members);
          break;
        case 'monthly':
          if (currentMonth) {
            const summaryData = generateMonthlySummary(payments, currentMonth);
            exportMonthlySummaryToXLSX(summaryData, currentMonth);
          }
          break;
        case 'backup':
          exportBackupToXLSX(members, payments);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Erro ao exportar XLSX:', error);
      alert('Erro ao exportar arquivo Excel');
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  };

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
      } else {
        alert('Erro ao gerar backup');
      }
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      alert('Erro ao exportar backup JSON');
    } finally {
      setIsExporting(false);
      setShowDropdown(false);
    }
  };

  const generateMonthlySummary = (payments, month) => {
    const monthPayments = payments.filter(payment => {
      if (!payment.due_date) return false;
      return payment.due_date.startsWith(month);
    });

    // Agrupar por dia
    const dayGroups = {};
    monthPayments.forEach(payment => {
      const day = payment.due_date;
      if (!dayGroups[day]) {
        dayGroups[day] = {
          date: day,
          income: 0,
          expenses: 0,
          count: 0
        };
      }

      if (payment.status === 'expense') {
        dayGroups[day].expenses += parseFloat(payment.amount || 0);
      } else {
        dayGroups[day].income += parseFloat(payment.amount || 0);
      }
      
      dayGroups[day].count++;
    });

    return Object.values(dayGroups)
      .map(day => ({
        ...day,
        balance: day.income - day.expenses
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className="btn btn-primary flex items-center"
      >
        {isExporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Exportando...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-2">
            <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-200">
              Exportar Sócios
            </div>
            <button
              onClick={() => handleExportCSV('members')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Sócios (CSV)
            </button>
            <button
              onClick={() => handleExportXLSX('members')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Sócios (Excel)
            </button>

            <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-200 mt-2">
              Exportar Pagamentos
            </div>
            <button
              onClick={() => handleExportCSV('payments')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Pagamentos (CSV)
            </button>
            <button
              onClick={() => handleExportXLSX('payments')}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Pagamentos (Excel)
            </button>

            {currentMonth && (
              <>
                <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-200 mt-2">
                  Resumo Mensal
                </div>
                <button
                  onClick={() => handleExportCSV('monthly')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Resumo (CSV)
                </button>
                <button
                  onClick={() => handleExportXLSX('monthly')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Resumo (Excel)
                </button>
              </>
            )}

            {showBackup && (
              <>
                <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-200 mt-2">
                  Backup Completo
                </div>
                <button
                  onClick={handleBackupJSON}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Backup (JSON)
                </button>
                <button
                  onClick={() => handleExportXLSX('backup')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Backup (Excel)
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Overlay para fechar dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        ></div>
      )}
    </div>
  );
};

export default ExportButtons;
