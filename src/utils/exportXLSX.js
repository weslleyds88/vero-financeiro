import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatDate } from './dateUtils';

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
    'Aplicativo': 'Vero Clube',
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
    'partial': 'Parcial',
    'paid': 'Pago',
    'expense': 'Despesa'
  };
  return statusMap[status] || status;
};

export const exportGroupMembersToXLSX = (members, groupName) => {
  // Preparar dados para exportação com TODAS as informações
  const ws_data = [
    // Cabeçalhos
    [
      'Nome Completo',
      'Email',
      'Telefone (WhatsApp)',
      'Data de Nascimento',
      'RG',
      'Região de SP',
      'Gênero',
      'Posição no Time',
      'Nome do Responsável',
      'Telefone do Responsável',
      'Data de Entrada no Grupo',
      'Status da Conta'
    ],
    // Dados dos membros
    ...members.map(member => {
      const profile = member.profiles || {};
      return [
        profile.full_name || 'Não informado',
        profile.email || 'Não informado',
        profile.phone || 'Não informado',
        profile.birth_date ? new Date(profile.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado',
        profile.rg || 'Não informado',
        profile.region || 'Não informado',
        profile.gender || 'Não informado',
        profile.position || 'Não informado',
        profile.responsible_name || 'Não informado',
        profile.responsible_phone || 'Não informado',
        member.joined_at ? new Date(member.joined_at).toLocaleDateString('pt-BR') : 'Não informado',
        profile.status === 'approved' ? 'Aprovado' : profile.status === 'pending' ? 'Pendente' : 'Rejeitado'
      ];
    })
  ];
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  // Configurar largura das colunas
  ws['!cols'] = [
    { width: 30 },  // Nome Completo
    { width: 30 },  // Email
    { width: 18 },  // Telefone (WhatsApp)
    { width: 18 },  // Data de Nascimento
    { width: 15 },  // RG
    { width: 18 },  // Região de SP
    { width: 15 },  // Gênero
    { width: 20 },  // Posição no Time
    { width: 25 },  // Nome do Responsável
    { width: 20 },  // Telefone do Responsável
    { width: 22 },  // Data de Entrada no Grupo
    { width: 15 }   // Status da Conta
  ];
  
  // Adicionar estilos ao cabeçalho (negrito)
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + "1"; // Primeira linha (cabeçalho)
    if (!ws[address]) continue;
    if (!ws[address].s) ws[address].s = {};
    ws[address].s.font = { bold: true };
  }
  
  // Nome da aba: usar nome do grupo (limitado a 31 caracteres)
  const sheetName = groupName.length > 31 ? groupName.substring(0, 31) : groupName;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Nome do arquivo
  const fileName = `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportTicketsToXLSX = (tickets) => {
  // Preparar dados para exportação com TODAS as informações dos tickets
  const ws_data = [
    // Cabeçalhos
    [
      'ID do Ticket',
      'Nome do Atleta',
      'Email',
      'Categoria',
      'Grupo',
      'Valor Pago',
      'Status do Pagamento',
      'Método de Pagamento',
      'Data de Aprovação',
      'Expira em',
      'Dias Restantes',
      'Tem Comprovante'
    ],
    // Dados dos tickets
    ...tickets.map(ticket => [
      ticket.ticket_id ? ticket.ticket_id.toString().slice(0, 8) : 'N/A',
      ticket.user_name || 'Não informado',
      ticket.user_email || 'Não informado',
      ticket.category || 'N/A',
      ticket.group_name || 'Sem grupo',
      parseFloat(ticket.amount || 0),
      ticket.payment_status || 'N/A',
      ticket.payment_method || 'N/A',
      ticket.approved_at ? new Date(ticket.approved_at).toLocaleDateString('pt-BR') + ' ' + new Date(ticket.approved_at).toLocaleTimeString('pt-BR') : 'N/A',
      ticket.expires_at ? new Date(ticket.expires_at).toLocaleDateString('pt-BR') : 'N/A',
      ticket.days_remaining || 0,
      ticket.has_proof ? 'Sim' : 'Não'
    ])
  ];
  
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  // Configurar largura das colunas
  ws['!cols'] = [
    { width: 15 },  // ID do Ticket
    { width: 25 },  // Nome do Atleta
    { width: 30 },  // Email
    { width: 18 },  // Categoria
    { width: 20 },  // Grupo
    { width: 12 },  // Valor Pago
    { width: 18 },  // Status do Pagamento
    { width: 18 },  // Método de Pagamento
    { width: 20 },  // Data de Aprovação
    { width: 15 },  // Expira em
    { width: 15 },  // Dias Restantes
    { width: 15 }   // Tem Comprovante
  ];
  
  // Formatação de moeda para a coluna de valor (coluna F - índice 5)
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = 1; R <= range.e.r; ++R) {
    const cell_address = XLSX.utils.encode_cell({ c: 5, r: R }); // Coluna F (Valor Pago)
    if (!ws[cell_address]) continue;
    ws[cell_address].z = '"R$ "#,##0.00';
  }
  
  // Adicionar estilos ao cabeçalho (negrito)
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + "1"; // Primeira linha (cabeçalho)
    if (!ws[address]) continue;
    if (!ws[address].s) ws[address].s = {};
    ws[address].s.font = { bold: true };
  }
  
  XLSX.utils.book_append_sheet(wb, ws, 'Tickets de Pagamento');
  
  // Nome do arquivo com data
  const fileName = `tickets_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
