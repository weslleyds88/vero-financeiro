import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/dateUtils';
import ExportButtons from './ExportButtons';
import Notifications from './Notifications';

const Dashboard = ({ db, members, payments, currentMonth, onMonthChange, onRefresh, isAdmin, supabase, currentUser }) => {
  // Estados para filtros independentes de mês e ano
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Função para gerar o texto do período selecionado
  const getPeriodLabel = () => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    if (selectedMonth === 'all') {
      return `Resumo Financeiro de ${selectedYear}`;
    } else {
      return `Resumo Financeiro de ${months[parseInt(selectedMonth)]} ${selectedYear}`;
    }
  };

  const [athleteStats, setAthleteStats] = useState({
    myPayments: 0,
    myPaidPayments: 0,
    myPendingPayments: 0,
    myTotalPending: 0,
    myPartialPayments: 0,
    myTotalPartial: 0,
    myDuePayments: 0,
    myOverduePayments: 0,
    myTotalDue: 0,
    myTotalOverdue: 0
  });

  // Declarar funções antes de usá-las nos hooks
  const calculateAdminStats = useCallback(() => {
    // Estatísticas gerais (para admin)
    if (isAdmin) {
      // Filtrar pagamentos de acordo com os filtros de mês e ano
      const monthPayments = payments.filter(payment => {
        if (!payment.due_date) return false;
        const paymentDate = new Date(payment.due_date);
        
        // Filtro de ano
        const yearMatch = paymentDate.getFullYear() === parseInt(selectedYear);
        
        // Filtro de mês (se 'all', aceita todos os meses)
        const monthMatch = selectedMonth === 'all' || 
                          paymentDate.getMonth() === parseInt(selectedMonth);
        
        return yearMatch && monthMatch;
      });

      // Receitas do mês atual (apenas valores efetivamente pagos)
      const totalIncome = monthPayments
        .filter(p => p.member_id)
        .reduce((sum, p) => {
          if (p.status === 'paid') {
            // Pagamento completo, somar valor total
            return sum + parseFloat(p.amount || 0);
          } else if (p.paid_amount && parseFloat(p.paid_amount) > 0) {
            // Pagamento parcial (status 'pending' mas com paid_amount > 0)
            // Somar apenas o que já foi pago
            return sum + parseFloat(p.paid_amount || 0);
          }
          // Pendentes SEM pagamento não entram na receita
          return sum;
        }, 0);

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

      // Calcular VALOR pendente de atletas (não apenas quantidade)
      const pendingAthleteValue = monthPayments
        .filter(p => p.member_id && p.status === 'pending')
        .reduce((sum, p) => {
          if (p.paid_amount && parseFloat(p.paid_amount) > 0) {
            // Pagamento parcial (tem paid_amount), somar apenas o que FALTA pagar
            const remaining = parseFloat(p.amount || 0) - parseFloat(p.paid_amount || 0);
            return sum + remaining;
          } else {
            // Pagamento totalmente pendente, somar valor completo
            return sum + parseFloat(p.amount || 0);
          }
        }, 0);

      // Calcular VALOR pendente de despesas
      const pendingExpensesValue = expenses
        .filter(p => p.status === 'expense' || (p.status === 'pending' && !p.member_id))
        .reduce((sum, p) => {
          if (p.paid_amount && parseFloat(p.paid_amount) > 0) {
            // Despesa parcialmente paga, somar apenas o que FALTA
            const remaining = parseFloat(p.amount || 0) - parseFloat(p.paid_amount || 0);
            return sum + remaining;
          } else {
            // Despesa totalmente pendente
            return sum + parseFloat(p.amount || 0);
          }
        }, 0);

      // Total de VALOR pendente = atletas + despesas
      const totalPendingValue = pendingAthleteValue + pendingExpensesValue;

      // Contar quantidade de pagamentos pagos (para o card "Pagos")
      const paidAthletePayments = monthPayments.filter(p => p.status === 'paid' && p.member_id).length;

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

      return {
        totalAthletes: members.length,
        totalIncome,
        totalExpenses, // Total de despesas (pagas + pendentes)
        totalPaidExpenses: totalPaidExpenses + totalCashOutflows, // Despesas efetivamente pagas
        pendingPayments: totalPendingValue, // VALOR pendente (atletas + despesas)
        paidPayments: paidAthletePayments, // Apenas atletas que pagaram
        balance,
        cashAvailable
      };
    }
    return {
      totalAthletes: 0,
      totalIncome: 0,
      totalExpenses: 0,
      totalPaidExpenses: 0,
      pendingPayments: 0,
      paidPayments: 0,
      balance: 0,
      cashAvailable: 0
    };
  }, [isAdmin, members, payments, selectedMonth, selectedYear]);

  const calculateAthleteStats = useCallback(() => {
    if (!currentUser || !currentUser.id) {
      setAthleteStats({
        myPayments: 0,
        myPaidPayments: 0,
        myPendingPayments: 0,
        myTotalPending: 0,
        myPartialPayments: 0,
        myTotalPartial: 0,
        myDuePayments: 0,
        myOverduePayments: 0,
        myTotalDue: 0,
        myTotalOverdue: 0
      });
      return;
    }
    
    // Filtrar APENAS os pagamentos deste usuário específico
    const myPayments = payments.filter(p => p.member_id === currentUser.id);
    
    // Separar pagamentos pendentes em "a vencer" e "vencidos"
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Zerar horas para comparação correta
    
    // Incluir cobranças PENDING e PARTIAL (que ainda não foram 100% pagas)
    const pendingPayments = myPayments.filter(p => p.status === 'pending' || p.status === 'partial');
    const duePayments = pendingPayments.filter(p => {
      const dueDate = new Date(p.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today;
    });
    const overduePayments = pendingPayments.filter(p => {
      const dueDate = new Date(p.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
    
    const myTotalPayments = myPayments.length;
    const myPaidPayments = myPayments.filter(p => p.status === 'paid').length;
    const myPendingPayments = pendingPayments.length;
    
    // Total Pendente: considerar valor restante para parciais
    const myTotalPending = pendingPayments.reduce((sum, p) => {
      if (p.status === 'pending') {
        return sum + parseFloat(p.amount || 0);
      } else if (p.status === 'partial' && p.paid_amount) {
        const remaining = parseFloat(p.amount || 0) - parseFloat(p.paid_amount || 0);
        return sum + remaining;
      }
      return sum;
    }, 0);
    
    const myDuePayments = duePayments.length;
    const myOverduePayments = overduePayments.length;
    
    // Total A Vencer: considerar valor restante para parciais
    const myTotalDue = duePayments.reduce((sum, p) => {
      if (p.status === 'pending') {
        return sum + parseFloat(p.amount || 0);
      } else if (p.status === 'partial' && p.paid_amount) {
        const remaining = parseFloat(p.amount || 0) - parseFloat(p.paid_amount || 0);
        return sum + remaining;
      }
      return sum;
    }, 0);
    
    // Total Vencido: considerar valor restante para parciais
    const myTotalOverdue = overduePayments.reduce((sum, p) => {
      if (p.status === 'pending') {
        return sum + parseFloat(p.amount || 0);
      } else if (p.status === 'partial' && p.paid_amount) {
        const remaining = parseFloat(p.amount || 0) - parseFloat(p.paid_amount || 0);
        return sum + remaining;
      }
      return sum;
    }, 0);
    
    // Adicionar informações de pagamentos parciais
    const partialPayments = myPayments.filter(p => p.status === 'partial');
    const myPartialPayments = partialPayments.length;
    const myTotalPartial = partialPayments.reduce((sum, p) => sum + parseFloat(p.paid_amount || 0), 0);

    setAthleteStats({
      myPayments: myTotalPayments,
      myPaidPayments,
      myPendingPayments,
      myTotalPending,
      myPartialPayments,
      myTotalPartial,
      myDuePayments,
      myOverduePayments,
      myTotalDue,
      myTotalOverdue
    });
  }, [payments, currentUser]);

  // Memoizar cálculos pesados para evitar recálculos desnecessários
  const stats = useMemo(() => {
    return calculateAdminStats();
  }, [calculateAdminStats]);

  // Calcular estatísticas do atleta separadamente
  useEffect(() => {
    if (!isAdmin && currentUser?.id) {
      calculateAthleteStats();
    }
  }, [isAdmin, currentUser, calculateAthleteStats]);

  const recentPayments = useMemo(() => {
    return payments
      .filter(p => p.paid_at)
      .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
      .slice(0, 5);
  }, [payments]);

  const getMemberName = (memberId) => {
    const member = members.find(m => m.id === memberId);
    return member ? (member.full_name || member.name) : 'N/A';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', label: 'Pendente' },
      paid: { class: 'status-paid', label: 'Pago' },
      expense: { class: 'status-expense', label: 'Despesa' },
      partial: { class: 'status-partial', label: 'Parcial' }
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
      {/* Header com Usuário */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          {/* Foto do Usuário */}
          <div className="flex-shrink-0">
            {currentUser?.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.full_name || 'Usuário'}
                className="w-16 h-16 rounded-full object-cover border-2 border-primary-300"
                onError={(e) => {
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div 
              className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center"
              style={{ display: currentUser?.avatar_url ? 'none' : 'flex' }}
            >
              <span className="text-primary-600 font-medium text-2xl">
                {currentUser?.full_name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
          </div>

          {/* Nome e Descrição */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentUser?.full_name || 'Usuário'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isAdmin
                ? 'Administrador - Visão geral das finanças'
                : 'Visualize suas mensalidades e taxas'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {currentUser && supabase && (
            <Notifications
              supabase={supabase}
              currentUser={currentUser}
              isVisible={!!currentUser}
            />
          )}
          {isAdmin && (
            <>
              <ExportButtons
                members={members}
                payments={payments.filter(p => {
                  if (!p.due_date) return false;
                  const paymentDate = new Date(p.due_date);
                  const yearMatch = paymentDate.getFullYear() === parseInt(selectedYear);
                  const monthMatch = selectedMonth === 'all' || paymentDate.getMonth() === parseInt(selectedMonth);
                  return yearMatch && monthMatch;
                })}
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
            </>
          )}
        </div>
      </div>

      {/* Filtros de Mês e Ano - apenas admin */}
      {isAdmin && (
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">📅 Mês:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Todos os meses</option>
              <option value="0">Janeiro</option>
              <option value="1">Fevereiro</option>
              <option value="2">Março</option>
              <option value="3">Abril</option>
              <option value="4">Maio</option>
              <option value="5">Junho</option>
              <option value="6">Julho</option>
              <option value="7">Agosto</option>
              <option value="8">Setembro</option>
              <option value="9">Outubro</option>
              <option value="10">Novembro</option>
              <option value="11">Dezembro</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">📆 Ano:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="2023">2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>
      )}

      {/* Cards de Estatísticas - diferentes para admin vs atleta */}
      {isAdmin ? (
        <>
          {/* Cards para Admin */}
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
                  <p className="text-lg font-bold text-warning-600 whitespace-nowrap">{formatCurrency(stats.pendingPayments)}</p>
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

          {/* Saldo do Período - apenas admin */}
          <div className="card p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{getPeriodLabel()}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <p className="text-sm text-green-600 font-medium">💵 Receitas</p>
                <p className="text-2xl font-bold text-success-600">{formatCurrency(stats.totalIncome)}</p>
                <p className="text-xs text-green-500 mt-1">Total de cobranças do mês</p>
              </div>
              <div className="text-center bg-red-50 rounded-lg p-4 border-2 border-red-200">
                <p className="text-sm text-red-600 font-medium">💳 Despesas Pagas</p>
                <p className="text-2xl font-bold text-danger-600">{formatCurrency(stats.totalPaidExpenses)}</p>
                <p className="text-xs text-red-500 mt-1">Total de gastos do mês</p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Cards para Atleta */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-success-100 rounded-lg flex-shrink-0">
                  <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600">Pagos</p>
                  <p className="text-lg font-bold text-success-600">{athleteStats.myPaidPayments}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600">Parciais</p>
                  <p className="text-lg font-bold text-orange-600">{athleteStats.myPartialPayments || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatCurrency(athleteStats.myTotalPartial || 0)}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600">A Vencer</p>
                  <p className="text-lg font-bold text-yellow-600">{athleteStats.myDuePayments}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatCurrency(athleteStats.myTotalDue)}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600">Vencidos</p>
                  <p className="text-lg font-bold text-red-600">{athleteStats.myOverduePayments}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatCurrency(athleteStats.myTotalOverdue)}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 rounded-lg flex-shrink-0">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600">Total de Cobranças</p>
                  <p className="text-lg font-bold text-primary-600">{athleteStats.myPayments}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Link rápido para pagamentos - apenas atletas */}
          <div className="card p-6 mb-8">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
              <Link
                to="/payments"
                className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Ver Minhas Despesas
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Pagamentos Recentes - apenas admin */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Pagamentos Recentes</h3>
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

          {/* Links Rápidos - apenas admin */}
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
                  <p className="font-medium text-gray-900">Gerar Cobrança</p>
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
      )}
    </div>
  );
};

export default Dashboard;
