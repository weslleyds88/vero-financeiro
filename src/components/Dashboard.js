import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, getPreviousMonth, getNextMonth } from '../utils/dateUtils';
import ExportButtons from './ExportButtons';

// Função auxiliar para formatar nome do mês
const formatMonthName = (monthString) => {
  if (!monthString) return 'Mês inválido';
  
  const [year, month] = monthString.split('-');
  const monthIndex = parseInt(month) - 1; // Converter para 0-11
  
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  return `${months[monthIndex]} ${year}`;
};

const Dashboard = ({ db, members, payments, currentMonth, onMonthChange, onRefresh }) => {
  const [stats, setStats] = useState({
    totalAthletes: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalPaidExpenses: 0,
    pendingPayments: 0,
    paidPayments: 0,
    balance: 0,
    cashAvailable: 0
  });

  const [recentPayments, setRecentPayments] = useState([]);

  useEffect(() => {
    calculateStats();
    loadRecentPayments();
  }, [members, payments, currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateStats = () => {
    // Filtrar pagamentos do mês atual para estatísticas mensais
    const monthPayments = payments.filter(payment => {
      if (!payment.due_date) return false;
      const paymentDate = new Date(payment.due_date);
      const [currentYear, currentMonthNum] = currentMonth.split('-');
      return paymentDate.getFullYear() === parseInt(currentYear) && 
             paymentDate.getMonth() === parseInt(currentMonthNum) - 1;
    });

    // Receitas do mês atual (apenas de atletas - mensalidades)
    const totalIncome = monthPayments
      .filter(p => (p.status === 'paid' || p.status === 'pending') && p.member_id)
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Despesas do mês atual (todas as despesas, incluindo as totalmente pagas)
    // Despesas são identificadas por NÃO ter member_id (diferente de mensalidades)
    const expenses = monthPayments.filter(p => 
      !p.member_id && p.category !== 'Saída de Caixa' && 
      (p.status === 'expense' || p.status === 'partial' || (p.status === 'paid' && p.amount > 0))
    );
    const totalExpenses = expenses.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const totalPaidExpenses = expenses.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);
    
    const cashOutflows = monthPayments.filter(p => p.category === 'Saída de Caixa');
    const totalCashOutflows = cashOutflows.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Contar pagamentos de atletas pendentes
    const pendingAthletePayments = monthPayments.filter(p => p.status === 'pending' && p.member_id).length;
    const paidAthletePayments = monthPayments.filter(p => p.status === 'paid' && p.member_id).length;
    
    // Contar despesas pendentes (não pagas completamente)
    const pendingExpenses = expenses.filter(p => p.status === 'expense' || p.status === 'partial').length;
    
    // Total de pendentes = atletas pendentes + despesas pendentes
    const totalPending = pendingAthletePayments + pendingExpenses;

    // Saldo do mês atual (Receitas - Despesas pagas)
    // Não subtraímos totalCashOutflows porque elas já estão incluídas em totalPaidExpenses
    const balance = totalIncome - (totalPaidExpenses + totalCashOutflows);

    // CAIXA ACUMULADO: Apenas receitas dos mensalistas - saídas de caixa
    const allTimeIncome = payments
      .filter(p => p.status === 'paid' && p.member_id) // Todas as mensalidades pagas vão para o caixa
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    const allTimeCashOutflows = payments
      .filter(p => p.category === 'Saída de Caixa')
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Caixa disponível = Receitas dos atletas - Saídas de caixa
    const cashAvailable = allTimeIncome - allTimeCashOutflows;

    setStats({
      totalAthletes: members.length,
      totalIncome,
      totalExpenses, // Total de despesas (pagas + pendentes)
      totalPaidExpenses: totalPaidExpenses + totalCashOutflows, // Despesas efetivamente pagas
      pendingPayments: totalPending, // Atletas pendentes + despesas pendentes
      paidPayments: paidAthletePayments, // Apenas atletas que pagaram
      balance,
      cashAvailable
    });
  };

  const loadRecentPayments = async () => {
    const recent = payments
      .filter(p => p.paid_at)
      .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
      .slice(0, 5);
    
    setRecentPayments(recent);
  };

  // Função removida - não está sendo usada
  // const handleMarkPaid = async (paymentId) => {
  //   const success = await db.markPaid(paymentId);
  //   if (success) {
  //     onRefresh();
  //   }
  // };

  const getMemberName = (memberId) => {
    const member = members.find(m => m.id === memberId);
    return member ? member.name : 'N/A';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', label: 'Pendente' },
      paid: { class: 'status-paid', label: 'Pago' },
      expense: { class: 'status-expense', label: 'Despesa' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${config.class}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Visão geral das finanças do time</p>
        </div>
        <div className="flex items-center space-x-4">
          <ExportButtons 
            members={members}
            payments={payments.filter(p => p.due_date && p.due_date.startsWith(currentMonth))}
            db={db}
          />
          <button
            onClick={onRefresh}
            className="btn btn-secondary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
        </div>
      </div>

      {/* Seletor de Mês */}
      <div className="flex items-center justify-center mb-6">
        <button
          onClick={() => onMonthChange(getPreviousMonth(currentMonth))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold text-gray-900 mx-4 min-w-[200px] text-center">
          {formatMonthName(currentMonth)}
        </h2>
        <button
          onClick={() => onMonthChange(getNextMonth(currentMonth))}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg flex-shrink-0">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600">Total de Atletas</p>
              <p className="text-lg font-bold text-gray-900 whitespace-nowrap">{stats.totalAthletes}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg flex-shrink-0">
              <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600">Receitas</p>
              <p className="text-lg font-bold text-success-600 whitespace-nowrap">{formatCurrency(stats.totalIncome)}</p>
            </div>
          </div>
        </div>


        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-danger-100 rounded-lg flex-shrink-0">
              <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600">Despesas</p>
              <p className="text-lg font-bold text-danger-600 whitespace-nowrap">{formatCurrency(stats.totalExpenses)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg flex-shrink-0">
              <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600">Pendentes</p>
              <p className="text-lg font-bold text-warning-600 whitespace-nowrap">{stats.pendingPayments}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg flex-shrink-0">
              <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600">Pagos</p>
              <p className="text-lg font-bold text-success-600 whitespace-nowrap">{stats.paidPayments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Saldo do Mês */}
      <div className="card p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo Financeiro</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Receitas</p>
            <p className="text-2xl font-bold text-success-600">{formatCurrency(stats.totalIncome)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Despesas Pagas</p>
            <p className="text-2xl font-bold text-danger-600">{formatCurrency(stats.totalPaidExpenses)}</p>
          </div>
          <div className="text-center bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
            <p className="text-sm text-blue-600 font-medium">💰 Caixa do Time</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.cashAvailable)}</p>
            <p className="text-xs text-blue-500 mt-1">Saldo acumulado total</p>
          </div>
        </div>
      </div>

      {/* Pagamentos Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pagamentos Recentes</h3>
            <Link to="/members" className="text-blue-600 hover:text-blue-800 font-medium">
              Novo Atleta →
            </Link>
          </div>
          <div className="space-y-3">
            {recentPayments.length > 0 ? (
              recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{getMemberName(payment.member_id)}</p>
                    <p className="text-sm text-gray-600">{payment.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum pagamento recente</p>
            )}
          </div>
        </div>

        {/* Links Rápidos */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="space-y-3">
            <Link
              to="/payments"
              className="flex items-center p-3 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-200"
            >
              <div className="p-2 bg-primary-100 rounded-lg mr-3">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Nova Mensalidade</p>
                <p className="text-sm text-gray-600">Registrar mensalidade de atleta</p>
              </div>
            </Link>

            <Link
              to="/expenses"
              className="flex items-center p-3 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200"
            >
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Nova Despesa</p>
                <p className="text-sm text-gray-600">Registrar gasto do time</p>
              </div>
            </Link>

            <Link
              to="/members"
              className="flex items-center p-3 bg-success-50 hover:bg-success-100 rounded-lg transition-colors duration-200"
            >
              <div className="p-2 bg-success-100 rounded-lg mr-3">
                <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Novo Atleta</p>
                <p className="text-sm text-gray-600">Cadastrar novo atleta do time</p>
              </div>
            </Link>

            <Link
              to="/calendar"
              className="flex items-center p-3 bg-warning-50 hover:bg-warning-100 rounded-lg transition-colors duration-200"
            >
              <div className="p-2 bg-warning-100 rounded-lg mr-3">
                <svg className="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Ver Calendário</p>
                <p className="text-sm text-gray-600">Visualização mensal dos pagamentos</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
