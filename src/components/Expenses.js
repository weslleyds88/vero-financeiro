import React, { useState } from 'react';
import { formatDate, formatCurrency, getPreviousMonth, getNextMonth, formatMonthName } from '../utils/dateUtils';
import ExportButtons from './ExportButtons';
import PartialPaymentModal from './PartialPaymentModal';


const Expenses = ({ db, payments, currentMonth, onMonthChange, onRefresh, members }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingExpense, setPayingExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar apenas despesas (incluindo parciais e totalmente pagas)
  // Despesas são identificadas por NÃO ter member_id
  const expenses = payments.filter(payment => 
    !payment.member_id && payment.category !== 'Saída de Caixa' &&
    (payment.status === 'expense' || payment.status === 'partial' || (payment.status === 'paid' && payment.amount > 0))
  );

  // Filtrar despesas por mês atual
  const filteredExpenses = expenses.filter(expense => {
    if (!expense.due_date) return false;
    const expenseDate = new Date(expense.due_date);
    return expenseDate.getFullYear() === currentMonth.year && 
           expenseDate.getMonth() === currentMonth.month;
  }).filter(expense => {
    // Aplicar filtro de busca se houver termo de busca
    if (!searchTerm) return true;

    const category = expense.category ? expense.category.toLowerCase() : '';
    const amount = expense.amount ? expense.amount.toString().toLowerCase() : '';
    const observation = expense.observation ? expense.observation.toLowerCase() : '';
    const date = expense.due_date ? formatDate(expense.due_date).toLowerCase() : '';

    return category.includes(searchTerm.toLowerCase()) ||
           amount.includes(searchTerm.toLowerCase()) ||
           observation.includes(searchTerm.toLowerCase()) ||
           date.includes(searchTerm.toLowerCase());
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Tem certeza que deseja excluir esta despesa?')) {
      setLoading(true);
      try {
        await db.deletePayment(expenseId);
        onRefresh();
      } catch (error) {
        console.error('Erro ao excluir despesa:', error);
        alert('Erro ao excluir despesa');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFormSubmit = async (expenseData) => {
    setLoading(true);
    try {
      // Garantir que é uma despesa
      const expense = {
        ...expenseData,
        status: 'expense',
        member_id: null // Despesas não têm atleta específico
      };

      if (editingExpense) {
        await db.updatePayment(editingExpense.id, expense);
      } else {
        await db.addPayment(expense);
      }
      
      setShowForm(false);
      setEditingExpense(null);
      onRefresh();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      alert('Erro ao salvar despesa');
    } finally {
      setLoading(false);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const handlePayExpense = (expense) => {
    setPayingExpense(expense);
    setShowPaymentModal(true);
  };

  const handlePartialPayment = async (paymentData) => {
    setLoading(true);
    try {
      console.log('Atualizando pagamento:', payingExpense.id, paymentData);
      
      // Se o pagamento foi feito com dinheiro do caixa, criar um registro de saída
      if (paymentData.payment_method === 'cash') {
        const cashPaymentAmount = paymentData.paid_amount - parseFloat(payingExpense.paid_amount || 0);
        
        // Criar registro de saída de caixa apenas se for um valor novo
        if (cashPaymentAmount > 0) {
          await db.addPayment({
            member_id: null,
            amount: cashPaymentAmount,
            paid_amount: cashPaymentAmount,
            category: 'Saída de Caixa',
            observation: `Pagamento: ${payingExpense.category} - ${formatCurrency(cashPaymentAmount)}`,
            due_date: new Date().toISOString().split('T')[0],
            paid_at: new Date().toISOString(),
            status: 'expense'
          });
        }
      }
      
      const updatedPayment = await db.updatePayment(payingExpense.id, {
        ...paymentData,
        updated_at: new Date().toISOString()
      });
      
      console.log('Pagamento atualizado:', updatedPayment);
      
      setShowPaymentModal(false);
      setPayingExpense(null);
      
      // Força a atualização da lista
      await onRefresh();
      
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert('Erro ao registrar pagamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentCancel = () => {
    setShowPaymentModal(false);
    setPayingExpense(null);
  };

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount || 0), 0);
  const totalPaid = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.paid_amount || 0), 0);
  const totalRemaining = totalExpenses - totalPaid;

  // Calcular dinheiro disponível em caixa (ACUMULADO - apenas receitas de atletas)
  const allTimeIncome = payments
    .filter(p => p.status === 'paid' && p.member_id) // Todas as mensalidades pagas vão para o caixa
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const allTimeCashOutflows = payments
    .filter(p => p.category === 'Saída de Caixa')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  // Caixa disponível = Receitas dos atletas - Saídas de caixa
  const cashAvailable = allTimeIncome - allTimeCashOutflows;

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Despesas do Time</h2>
          <button
            onClick={handleAddExpense}
            className="btn btn-primary"
            disabled={loading}
          >
            Nova Despesa
          </button>
        </div>

        {/* Controles de Mês */}
        <div className="card p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <label className="label">Mês/Ano</label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onMonthChange(getPreviousMonth(currentMonth))}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-medium text-gray-900 min-w-[120px] text-center">
                  {formatMonthName(currentMonth)}
                </span>
                <button
                  onClick={() => onMonthChange(getNextMonth(currentMonth))}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center space-x-2">
              <ExportButtons 
                payments={filteredExpenses}
                db={db}
                currentMonth={currentMonth}
                type="expenses"
              />
            </div>
          </div>
        </div>


        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-danger-100 rounded-lg">
                <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Despesas</p>
                <p className="text-2xl font-bold text-danger-600">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Já Pago</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">A Pagar</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalRemaining)}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Quantidade</p>
                <p className="text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
              </div>
            </div>
          </div>
        </div>


        {/* Barra de Pesquisa */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por categoria, valor, observação ou data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Lista de Despesas */}
        <div className="card">
          {filteredExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Restante
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => {
                    const totalAmount = parseFloat(expense.amount || 0);
                    const paidAmount = parseFloat(expense.paid_amount || 0);
                    const remainingAmount = totalAmount - paidAmount;
                    const isFullyPaid = expense.status === 'paid' || remainingAmount <= 0;
                    
                    return (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(expense.due_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                          {formatCurrency(totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCurrency(paidAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                          {formatCurrency(remainingAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isFullyPaid ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✅ Pago
                            </span>
                          ) : paidAmount > 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⏳ Parcial
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ❌ Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {!isFullyPaid && (
                              <button
                                onClick={() => handlePayExpense(expense)}
                                className="text-green-600 hover:text-green-900"
                                title="Pagar despesa"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleEditExpense(expense)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar despesa"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Excluir despesa"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma despesa encontrada</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comece adicionando uma nova despesa para este mês.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleAddExpense}
                  className="btn btn-primary"
                >
                  Adicionar Despesa
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal do Formulário */}
      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {/* Modal de Pagamento Parcial */}
      {showPaymentModal && payingExpense && (
        <PartialPaymentModal
          expense={payingExpense}
          onSubmit={handlePartialPayment}
          onCancel={handlePaymentCancel}
          cashAvailable={cashAvailable}
        />
      )}
    </div>
  );
};

// Componente do formulário de despesa
const ExpenseForm = ({ expense, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    category: expense?.category || '',
    amount: expense?.amount || '',
    due_date: expense?.due_date || new Date().toISOString().split('T')[0],
    observation: expense?.observation || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category || !formData.amount) {
      alert('Categoria e valor são obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {expense ? 'Editar Despesa' : 'Nova Despesa'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {expense ? 'Atualize as informações da despesa' : 'Registre uma nova despesa do time'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category" className="label">
              Categoria *
            </label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="input"
              placeholder="Ex: Campeonato, Material, Transporte..."
              required
            />
          </div>

          <div>
            <label htmlFor="amount" className="label">
              Valor *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className="input"
              placeholder="0,00"
              step="0.01"
              min="0"
              required
            />
          </div>

          <div>
            <label htmlFor="due_date" className="label">
              Data da Despesa
            </label>
            <input
              type="date"
              id="due_date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="observation" className="label">
              Observação
            </label>
            <textarea
              id="observation"
              name="observation"
              value={formData.observation}
              onChange={handleChange}
              rows={3}
              className="input resize-none"
              placeholder="Detalhes sobre a despesa..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                expense ? 'Atualizar Despesa' : 'Adicionar Despesa'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Expenses;
