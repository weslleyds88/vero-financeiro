import React, { useState, useEffect } from 'react';
import PaymentForm from './PaymentForm';
import ExportButtons from './ExportButtons';
import { formatDate, formatCurrency, getCurrentMonthObj, getPreviousMonth, getNextMonth, formatMonthName } from '../utils/dateUtils';


const Payments = ({ db, members, payments, filters, onFiltersChange, onRefresh, isAdmin }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);

  const categories = [
    'Mensalidade',
    'Uniforme',
    'Taxa de Inscrição',
    'Taxa de Competição',
    'Material Individual',
    'Outros'
  ];

  useEffect(() => {
    applyFilters();
  }, [payments, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => {
    // Filtrar apenas pagamentos de atletas (que têm member_id)
    let filtered = payments.filter(p => p.member_id && p.status !== 'expense' && p.status !== 'partial');

    // No modo visualização, mostrar apenas pagamentos do próprio atleta
    if (!isAdmin) {
      // Para modo visualização, precisamos de uma forma de identificar o atleta atual
      // Por ora, vamos permitir ver todos os pagamentos (como solicitado)
      // Mas podemos adicionar lógica para filtrar por atleta específico depois
    }

    if (filters.member_id) {
      filtered = filtered.filter(p => p.member_id === parseInt(filters.member_id));
    }

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    // Filtrar por mês/ano
    if (filters.month) {
      filtered = filtered.filter(p => {
        if (!p.due_date) return false;
        const date = new Date(p.due_date);
        return date.getMonth() === filters.month.month && 
               date.getFullYear() === filters.month.year;
      });
    }

    setFilteredPayments(filtered);
  };

  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' ou 'desc'

  const sortedAndFilteredPayments = filteredPayments.sort((a, b) => {
    // Ordenar primeiro por nome do atleta, depois por data
    const memberA = members.find(m => m.id === a.member_id);
    const memberB = members.find(m => m.id === b.member_id);
    const nameA = memberA ? memberA.name.toLowerCase() : '';
    const nameB = memberB ? memberB.name.toLowerCase() : '';

    if (sortOrder === 'asc') {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  const handleAddPayment = () => {
    if (!isAdmin) {
      alert('Modo visualização: você não pode adicionar novos pagamentos.');
      return;
    }
    setEditingPayment(null);
    setShowForm(true);
  };

  const handleEditPayment = (payment) => {
    if (!isAdmin) {
      alert('Modo visualização: você não pode editar pagamentos.');
      return;
    }
    setEditingPayment(payment);
    setShowForm(true);
  };

  const handleDeletePayment = async (id) => {
    if (!isAdmin) {
      alert('Modo visualização: você não pode excluir pagamentos.');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.')) {
      const success = await db.deletePayment(id);
      if (success) {
        onRefresh();
      } else {
        alert('Erro ao excluir pagamento');
      }
    }
  };

  const handleMarkPaid = async (paymentId) => {
    if (!isAdmin) {
      alert('Modo visualização: você não pode marcar pagamentos como pagos.');
      return;
    }
    const success = await db.markPaid(paymentId);
    if (success) {
      onRefresh();
    } else {
      alert('Erro ao marcar pagamento como pago');
    }
  };

  const handleMarkSelectedPaid = async () => {
    if (!isAdmin) {
      alert('Modo visualização: você não pode marcar pagamentos como pagos.');
      return;
    }
    if (selectedPayments.length === 0) return;

    setIsMarkingPaid(true);
    const success = await db.markPaidBulk(selectedPayments);
    
    if (success) {
      setSelectedPayments([]);
      onRefresh();
    } else {
      alert('Erro ao marcar pagamentos como pagos');
    }
    
    setIsMarkingPaid(false);
  };

  const handleFormSubmit = async (paymentData) => {
    let success = false;
    
    if (editingPayment) {
      success = await db.updatePayment(editingPayment.id, paymentData);
    } else {
      const result = await db.addPayment(paymentData);
      success = !!result;
    }

    if (success) {
      setShowForm(false);
      setEditingPayment(null);
      onRefresh();
    } else {
      alert('Erro ao salvar pagamento');
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingPayment(null);
  };

  const handleSelectPayment = (paymentId, isSelected) => {
    if (isSelected) {
      setSelectedPayments(prev => [...prev, paymentId]);
    } else {
      setSelectedPayments(prev => prev.filter(id => id !== paymentId));
    }
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      const pendingIds = filteredPayments
        .filter(p => p.status === 'pending')
        .map(p => p.id);
      setSelectedPayments(pendingIds);
    } else {
      setSelectedPayments([]);
    }
  };

  const getMemberName = (memberId) => {
    if (!memberId) return 'Despesa Geral';
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

  const pendingPayments = filteredPayments.filter(p => p.status === 'pending');
  const allPendingSelected = pendingPayments.length > 0 && 
    pendingPayments.every(p => selectedPayments.includes(p.id));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagamentos dos Atletas</h1>
          <p className="text-gray-600 mt-1">Gerencie mensalidades e taxas dos atletas</p>
        </div>
        <div className="flex space-x-3">
          <ExportButtons 
            members={members}
            payments={filteredPayments}
            db={db}
            currentMonth={filters.month}
          />
          <button
            onClick={handleAddPayment}
            disabled={!isAdmin}
            className={`btn ${isAdmin ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {isAdmin ? 'Nova Mensalidade' : 'Modo Visualização'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Filtro de Mês */}
          <div>
            <label className="label">Mês</label>
            <div className="flex items-center">
              <button
                onClick={() => onFiltersChange({...filters, month: getPreviousMonth(filters.month)})}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium text-gray-900 mx-2 min-w-[120px] text-center">
                {formatMonthName(filters.month)}
              </span>
              <button
                onClick={() => onFiltersChange({...filters, month: getNextMonth(filters.month)})}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filtro de Sócio */}
          <div>
            <label className="label">Atleta</label>
            <select
              value={filters.member_id}
              onChange={(e) => onFiltersChange({...filters, member_id: e.target.value})}
              className="input"
            >
              <option value="">Todos</option>
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
              <option value="null">Despesas Gerais</option>
            </select>
          </div>

          {/* Filtro de Status */}
          <div>
            <label className="label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => onFiltersChange({...filters, status: e.target.value})}
              className="input"
            >
              <option value="">Todos</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="expense">Despesa</option>
            </select>
          </div>

          {/* Filtro de Categoria */}
          <div>
            <label className="label">Categoria</label>
            <select
              value={filters.category}
              onChange={(e) => onFiltersChange({...filters, category: e.target.value})}
              className="input"
            >
              <option value="">Todas</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Ordenação Alfabética */}
          <div>
            <label className="label">Ordenação</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="input"
            >
              <option value="asc">A-Z ↑</option>
              <option value="desc">Z-A ↓</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ações em Lote */}
      {selectedPayments.length > 0 && (
        <div className="card p-4 mb-6 bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-700">
              {selectedPayments.length} pagamento(s) selecionado(s)
            </span>
            <button
              onClick={handleMarkSelectedPaid}
              disabled={isMarkingPaid || !isAdmin}
              className={`btn ${isAdmin ? 'btn-success' : 'btn-secondary opacity-50 cursor-not-allowed'} btn-sm`}
            >
              {isMarkingPaid ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Marcando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Marcar como Pago
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lista de Pagamentos */}
      <div className="card">
        {sortedAndFilteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      disabled={pendingPayments.length === 0 || !isAdmin}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atleta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Observação
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAndFilteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedPayments.includes(payment.id)}
                        onChange={(e) => handleSelectPayment(payment.id, e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        disabled={payment.status !== 'pending' || !isAdmin}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getMemberName(payment.member_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={payment.status === 'expense' ? 'text-danger-600' : 'text-success-600'}>
                        {formatCurrency(payment.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.due_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {payment.observation || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {payment.status === 'pending' && (
                          <button
                            onClick={() => handleMarkPaid(payment.id)}
                            disabled={!isAdmin}
                            className={`${
                              isAdmin
                                ? 'text-success-600 hover:text-success-900'
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                            title={isAdmin ? 'Marcar como Pago' : 'Modo visualização'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleEditPayment(payment)}
                          disabled={!isAdmin}
                          className={`${
                            isAdmin
                              ? 'text-primary-600 hover:text-primary-900'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                          title={isAdmin ? 'Editar' : 'Modo visualização'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          disabled={!isAdmin}
                          className={`${
                            isAdmin
                              ? 'text-danger-600 hover:text-danger-900'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                          title={isAdmin ? 'Excluir' : 'Modo visualização'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum pagamento encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tente ajustar os filtros ou adicione um novo pagamento.
            </p>
            <div className="mt-6">
              <button
                onClick={handleAddPayment}
                disabled={!isAdmin}
                className={`btn ${isAdmin ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Adicionar Pagamento
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resumo dos Filtros */}
      {filteredPayments.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-success-100 rounded-lg">
                <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Receitas</p>
                <p className="text-2xl font-bold text-success-600">
                  {formatCurrency(
                    filteredPayments
                      .filter(p => p.status !== 'expense')
                      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-danger-100 rounded-lg">
                <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Despesas</p>
                <p className="text-2xl font-bold text-danger-600">
                  {formatCurrency(
                    filteredPayments
                      .filter(p => p.status === 'expense')
                      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
                  )}
                </p>
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
                <p className="text-2xl font-bold text-warning-600">
                  {filteredPayments.filter(p => p.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <PaymentForm
              payment={editingPayment}
              members={members}
              categories={categories}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
