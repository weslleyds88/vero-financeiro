import React, { useState } from 'react';
import { formatCurrency } from '../utils/dateUtils';

const PartialPaymentModal = ({ expense, onSubmit, onCancel, cashAvailable }) => {
  // Função para arredondar valores e evitar problemas de precisão
  const roundToTwoDec = (num) => Math.round(num * 100) / 100;
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [observation, setObservation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(roundToTwoDec(cashAvailable) > 0 ? 'cash' : 'external'); // Seleciona automaticamente baseado no caixa
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmount = roundToTwoDec(parseFloat(expense.amount || 0));
  const paidAmount = roundToTwoDec(parseFloat(expense.paid_amount || 0));
  const remainingAmount = roundToTwoDec(totalAmount - paidAmount);
  const roundedCashAvailable = roundToTwoDec(cashAvailable);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payment = parseFloat(paymentAmount);
    
    if (!payment || payment <= 0) {
      alert('Valor do pagamento deve ser maior que zero');
      return;
    }

    // Tolerância para problemas de precisão de ponto flutuante (0.01)
    if (payment > remainingAmount + 0.005) { // Tolerância de meio centavo
      alert(`Valor não pode ser maior que o saldo restante: ${formatCurrency(remainingAmount)}`);
      return;
    }

    if (paymentMethod === 'cash' && payment > roundedCashAvailable + 0.005) { // Tolerância também para o caixa
      alert(`Valor não pode ser maior que o dinheiro em caixa: ${formatCurrency(roundedCashAvailable)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newPaidAmount = roundToTwoDec(paidAmount + payment);
      const newStatus = newPaidAmount >= totalAmount ? 'paid' : 'partial';
      
      await onSubmit({
        paid_amount: newPaidAmount,
        status: newStatus,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        observation: observation ? `${expense.observation || ''}\n\nPagamento: ${formatCurrency(payment)} - ${observation}`.trim() : expense.observation,
        payment_method: paymentMethod
      });
    } catch (error) {
      console.error('Erro no pagamento:', error);
      alert('Erro ao processar pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Pagar Despesa Parcialmente
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {expense.category}
          </p>
        </div>

        {/* Resumo da Despesa */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Valor Total:</span>
              <span className="font-medium">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Já Pago:</span>
              <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-medium">Saldo Restante:</span>
              <span className="font-bold text-red-600">{formatCurrency(remainingAmount)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Aviso quando não há dinheiro em caixa */}
          {roundedCashAvailable <= 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm text-yellow-800">
                  <strong>Atenção:</strong> Não há dinheiro disponível em caixa. Use "Dinheiro Externo" para este pagamento.
                </p>
              </div>
            </div>
          )}

          {/* Método de Pagamento */}
          <div>
            <label className="label">Método de Pagamento *</label>
            <div className="space-y-2">
              <label className={`flex items-center ${roundedCashAvailable <= 0 ? 'opacity-50' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-2"
                  disabled={roundedCashAvailable <= 0}
                />
                <span>Dinheiro do Caixa</span>
                <span className={`ml-2 text-sm ${roundedCashAvailable <= 0 ? 'text-red-500' : 'text-gray-500'}`}>
                  (Disponível: {formatCurrency(roundedCashAvailable)})
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="external"
                  checked={paymentMethod === 'external'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mr-2"
                />
                <span>Dinheiro Externo</span>
                <span className="ml-2 text-sm text-gray-500">
                  (Não afeta o caixa)
                </span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="paymentAmount" className="label">
              Valor a Pagar *
            </label>
            <input
              type="number"
              id="paymentAmount"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="input"
              placeholder="0,00"
              step="0.01"
              min="0.01"
              max={paymentMethod === 'cash' ? 
                Math.max(0.01, Math.min(remainingAmount, roundedCashAvailable)) : 
                remainingAmount
              }
              required
              disabled={paymentMethod === 'cash' && roundedCashAvailable <= 0}
            />
            <p className="text-xs text-gray-500 mt-1">
              {paymentMethod === 'cash' && roundedCashAvailable <= 0 ? (
                <span className="text-red-600">Sem dinheiro em caixa disponível</span>
              ) : (
                <>Máximo: {formatCurrency(paymentMethod === 'cash' ? Math.min(remainingAmount, roundedCashAvailable) : remainingAmount)}</>
              )}
            </p>
          </div>

          <div>
            <label htmlFor="observation" className="label">
              Observação do Pagamento
            </label>
            <textarea
              id="observation"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Ex: Pagamento via PIX, Parcela 1/2..."
            />
          </div>

          {/* Preview do Resultado */}
          {paymentAmount && parseFloat(paymentAmount) > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">Após este pagamento:</p>
              <div className="text-xs text-blue-700 mt-1 space-y-1">
                <div>Pago: {formatCurrency(paidAmount + parseFloat(paymentAmount))}</div>
                <div>Restante: {formatCurrency(remainingAmount - parseFloat(paymentAmount))}</div>
                <div>Status: {(paidAmount + parseFloat(paymentAmount)) >= totalAmount ? 
                  <span className="text-green-600 font-medium">✅ Totalmente Pago</span> : 
                  <span className="text-yellow-600 font-medium">⏳ Parcialmente Pago</span>
                }</div>
              </div>
            </div>
          )}

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
              disabled={isSubmitting || (paymentMethod === 'cash' && roundedCashAvailable <= 0)}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processando...
                </>
              ) : (
                'Registrar Pagamento'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PartialPaymentModal;
