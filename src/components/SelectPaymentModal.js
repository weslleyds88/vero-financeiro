import React from 'react';
import { formatCurrency, formatDate } from '../utils/dateUtils';

const SelectPaymentModal = ({ payments, onSelect, onClose, onPayAll }) => {
  // Estado para controlar quais pagamentos estão selecionados
  const [selectedPayments, setSelectedPayments] = React.useState([]);
  
  // Filtrar apenas pagamentos pendentes ou parciais
  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'partial');

  // Calcular valor total das selecionadas
  const totalSelected = selectedPayments.reduce((sum, p) => {
    const amount = parseFloat(p.amount || 0);
    const paidAmount = parseFloat(p.paid_amount || 0);
    return sum + (amount - paidAmount);
  }, 0);

  // Toggle seleção de um pagamento
  const togglePayment = (payment) => {
    setSelectedPayments(prev => {
      const exists = prev.find(p => p.id === payment.id);
      if (exists) {
        return prev.filter(p => p.id !== payment.id);
      } else {
        return [...prev, payment];
      }
    });
  };

  // Selecionar/Desselecionar todos
  const toggleAll = () => {
    if (selectedPayments.length === pendingPayments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments([...pendingPayments]);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            Selecione o Pagamento
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Área de Seleção Múltipla */}
        {pendingPayments.length > 1 && (
          <div className="mb-4">
            {/* Card de Selecionadas */}
            {selectedPayments.length > 0 && (
              <div className="mb-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-green-900 mb-1">
                      ✅ {selectedPayments.length} Cobrança(s) Selecionada(s)
                    </h4>
                    <p className="text-sm text-green-700">
                      Total a pagar: {formatCurrency(totalSelected)}
                    </p>
                  </div>
                  <button
                    onClick={() => onPayAll && onPayAll(selectedPayments)}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    Pagar Selecionadas →
                  </button>
                </div>
              </div>
            )}

            {/* Botão Selecionar Todas */}
            <button
              onClick={toggleAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-2"
            >
              {selectedPayments.length === pendingPayments.length ? '❌ Desmarcar Todas' : '✅ Selecionar Todas'}
            </button>
          </div>
        )}

        <p className="text-gray-600 mb-4">
          {pendingPayments.length > 1 
            ? '✔️ Marque as cobranças que deseja pagar ou clique em uma para pagar individualmente:'
            : 'Clique na cobrança para pagar:'}
        </p>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {pendingPayments.map((payment) => {
            const isSelected = selectedPayments.find(p => p.id === payment.id);
            
            return (
            <div
              key={payment.id}
              className={`border rounded-lg p-4 transition-all duration-200 ${
                isSelected 
                  ? 'border-green-400 bg-green-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* Checkbox para seleção múltipla */}
                {pendingPayments.length > 1 && (
                  <div className="flex-shrink-0 pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePayment(payment)}
                      className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                
                {/* Conteúdo do pagamento */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {payment.category}
                    </h4>
                    {(payment.status === 'partial' || (payment.paid_amount && parseFloat(payment.paid_amount) > 0)) && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Pagamento Parcial
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>
                      <strong>Valor Total:</strong> {formatCurrency(parseFloat(payment.amount))}
                    </p>
                    
                    {payment.paid_amount && parseFloat(payment.paid_amount) > 0 ? (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-green-600 font-semibold">
                              {formatCurrency(parseFloat(payment.paid_amount))}
                            </span>
                            <span className="text-gray-400">/</span>
                            <span className="text-gray-900 font-semibold">
                              {formatCurrency(parseFloat(payment.amount))}
                            </span>
                          </div>
                          
                          {/* Barra de Progresso */}
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-300"
                              style={{
                                width: `${(parseFloat(payment.paid_amount) / parseFloat(payment.amount)) * 100}%`
                              }}
                            ></div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-green-600">
                              ✓ Pago: {formatCurrency(parseFloat(payment.paid_amount))}
                            </span>
                            <span className="text-red-600">
                              Falta: {formatCurrency(parseFloat(payment.amount) - parseFloat(payment.paid_amount))}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 italic">
                        Nenhum valor pago ainda
                      </p>
                    )}
                    
                    <p>
                      <strong>Vencimento:</strong> {formatDate(payment.due_date)}
                    </p>
                    
                    {payment.observation && (
                      <p className="text-xs text-gray-500">
                        {payment.observation}
                      </p>
                    )}

                    {payment.pix_key && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <p className="text-xs font-semibold text-gray-700">💰 Dados PIX:</p>
                        <p className="text-xs text-gray-600">
                          <strong>Chave:</strong> {payment.pix_key}
                        </p>
                        {payment.pix_name && (
                          <p className="text-xs text-gray-600">
                            <strong>Nome:</strong> {payment.pix_name}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de pagamento individual */}
                <div className="ml-4 flex-shrink-0">
                  <button
                    onClick={() => onSelect(payment)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    {pendingPayments.length > 1 ? 'Pagar Só Esta' : 'Pagar →'}
                  </button>
                </div>
              </div>
            </div>
            );
          })}
        </div>

        {pendingPayments.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum pagamento pendente</h3>
            <p className="mt-1 text-sm text-gray-500">Você está em dia! 🎉</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectPaymentModal;

