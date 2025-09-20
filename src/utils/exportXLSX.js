import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatDate, formatCurrency } from './dateUtils';

export const exportMembersToXLSX = (members) => {
  const ws_data = [
    ['ID', 'Nome', 'Telefone', 'Observação', 'Data de Cadastro'],
    ...members.map(member => [
      member.id,
      member.name,
      member.phone || '',
      member.observation || '',
      formatDate(member.created_at)
    ])
  ];
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  // Formatação das colunas
  const range = XLSX.utils.decode_range(ws['!ref']);
  ws['!cols'] = [
    { width: 8 },   // ID
    { width: 25 },  // Nome
    { width: 15 },  // Telefone
    { width: 30 },  // Observação
    { width: 15 }   // Data
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Atletas');
  XLSX.writeFile(wb, 'atletas.xlsx');
};

export const exportPaymentsToXLSX = (payments, members) => {
  const ws_data = [
    ['ID', 'Atleta', 'Valor', 'Categoria', 'Status', 'Vencimento', 'Pagamento', 'Observação'],
    ...payments.map(payment => {
      const member = members.find(m => m.id === payment.member_id);
      return [
        payment.id,
        member ? member.name : 'Despesa Geral',
        parseFloat(payment.amount),
        payment.category,
        payment.status === 'pending' ? 'Pendente' : payment.status === 'paid' ? 'Pago' : 'Despesa',
        payment.due_date ? formatDate(payment.due_date) : '',
        payment.paid_at ? formatDate(payment.paid_at) : '',
        payment.observation || ''
      ];
    })
  ];
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  // Formatação das colunas
  ws['!cols'] = [
    { width: 8 },   // ID
    { width: 20 },  // Atleta
    { width: 12 },  // Valor
    { width: 15 },  // Categoria
    { width: 10 },  // Status
    { width: 12 },  // Vencimento
    { width: 12 },  // Pagamento
    { width: 25 }   // Observação
  ];
  
  // Formatação de moeda para a coluna de valor
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 1; R <= range.e.r; ++R) {
    const cell_address = XLSX.utils.encode_cell({ c: 2, r: R }); // Coluna C (Valor)
    if (!ws[cell_address]) continue;
    ws[cell_address].z = '"R$ "#,##0.00';
  }
  
  XLSX.utils.book_append_sheet(wb, ws, 'Pagamentos');
  XLSX.writeFile(wb, 'pagamentos.xlsx');
};

export const exportMonthlySummaryToXLSX = (summaryData, month) => {
  const data = summaryData.map(day => ({
    'Data': formatDate(day.date),
    'Receitas': day.income,
    'Despesas': day.expenses,
    'Saldo do Dia': day.balance,
    'Quantidade de Movimentos': day.count
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo Mensal');

  // Ajustar largura das colunas
  const colWidths = [
    { wch: 12 }, // Data
    { wch: 15 }, // Receitas
    { wch: 15 }, // Despesas
    { wch: 15 }, // Saldo do Dia
    { wch: 20 }  // Quantidade de Movimentos
  ];
  worksheet['!cols'] = colWidths;

  // Formatação de moeda para as colunas de valores
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let row = 1; row <= range.e.r; row++) {
    // Receitas, Despesas, Saldo do Dia
    [1, 2, 3].forEach(col => {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].z = '"R$"#,##0.00';
      }
    });
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `resumo-mensal-${month}.xlsx`);
};

export const exportBackupToXLSX = (members, payments) => {
  // Planilha de Atletas
  const membersData = members.map(member => ({
    'ID': member.id,
    'Nome': member.name || '',
    'Telefone': member.phone || '',
    'Observação': member.observation || '',
    'Data de Cadastro': formatDate(member.created_at),
    'Última Atualização': formatDate(member.updated_at)
  }));

  // Planilha de Pagamentos
  const paymentsData = payments.map(payment => {
    const member = members.find(m => m.id === payment.member_id);
    return {
      'ID': payment.id,
      'ID do Sócio': payment.member_id,
      'Sócio': member ? member.name : 'N/A',
      'Valor': payment.amount,
      'Categoria': payment.category || '',
      'Status': getStatusLabel(payment.status),
      'Observação': payment.observation || '',
      'Data de Vencimento': payment.due_date ? formatDate(payment.due_date) : '',
      'Data de Pagamento': payment.paid_at ? formatDate(payment.paid_at) : '',
      'Data de Criação': formatDate(payment.created_at),
      'Última Atualização': formatDate(payment.updated_at)
    };
  });

  const workbook = XLSX.utils.book_new();
  
  // Adicionar planilha de sócios
  const membersWorksheet = XLSX.utils.json_to_sheet(membersData);
  XLSX.utils.book_append_sheet(workbook, membersWorksheet, 'Atletas');

  // Adicionar planilha de pagamentos
  const paymentsWorksheet = XLSX.utils.json_to_sheet(paymentsData);
  XLSX.utils.book_append_sheet(workbook, paymentsWorksheet, 'Pagamentos');

  // Adicionar planilha de metadados
  const metadata = [{
    'Aplicativo': 'Despesas Vero',
    'Versão': '1.0.0',
    'Data do Backup': formatDate(new Date()),
    'Total de Atletas': members.length,
    'Total de Pagamentos': payments.length
  }];
  const metadataWorksheet = XLSX.utils.json_to_sheet(metadata);
  XLSX.utils.book_append_sheet(workbook, metadataWorksheet, 'Informações');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  saveAs(blob, `backup-despesas-vero-${timestamp}.xlsx`);
};

const getStatusLabel = (status) => {
  const statusMap = {
    'pending': 'Pendente',
    'paid': 'Pago',
    'expense': 'Despesa'
  };
  return statusMap[status] || status;
};
