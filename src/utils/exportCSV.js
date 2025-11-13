import { formatDate, formatCurrency } from './dateUtils';

export const exportMembersToCSV = (members) => {
  const headers = ['ID', 'Nome', 'Telefone', 'Observação', 'Data de Cadastro'];
  
  const csvContent = [
    headers.join(','),
    ...members.map(member => [
      member.id,
      `"${member.name}"`,
      `"${member.phone || ''}"`,
      `"${member.observation || ''}"`,
      formatDate(member.created_at)
    ].join(','))
  ].join('\n');

  downloadCSV(csvContent, 'atletas.csv');
};

export const exportPaymentsToCSV = (payments, members) => {
  const headers = ['ID', 'Atleta', 'Valor', 'Categoria', 'Status', 'Vencimento', 'Pagamento', 'Observação'];
  
  const csvContent = [
    headers.join(','),
    ...payments.map(payment => {
      const member = members.find(m => m.id === payment.member_id);
      return [
        payment.id,
        `"${member ? member.name : 'Despesa Geral'}"`,
        payment.amount,
        `"${payment.category}"`,
        payment.status === 'pending' ? 'Pendente' : payment.status === 'paid' ? 'Pago' : 'Despesa',
        payment.due_date ? formatDate(payment.due_date) : '',
        payment.paid_at ? formatDate(payment.paid_at) : '',
        `"${payment.observation || ''}"`
      ].join(',');
    })
  ].join('\n');
  
  downloadCSV(csvContent, 'pagamentos.csv');
};

export const exportMonthlySummaryToCSV = (summaryData, month) => {
  const headers = [
    'Data',
    'Receitas',
    'Despesas',
    'Saldo do Dia',
    'Quantidade de Movimentos'
  ];
  
  const csvContent = [
    headers.join(','),
    ...summaryData.map(day => [
      `"${formatDate(day.date)}"`,
      `"${formatCurrency(day.income)}"`,
      `"${formatCurrency(day.expenses)}"`,
      `"${formatCurrency(day.balance)}"`,
      day.count
    ].join(','))
  ].join('\n');

  downloadCSV(csvContent, `resumo-mensal-${month}.csv`);
};

const downloadCSV = (csvContent, filename) => {
  // Adicionar BOM para suporte a caracteres especiais no Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
