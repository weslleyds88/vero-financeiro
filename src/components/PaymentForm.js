import React, { useState, useEffect } from 'react';
import { toDateString } from '../utils/dateUtils';

const PaymentForm = ({ payment, members, categories, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    category: '',
    observation: '',
    due_date: '',
    status: 'pending',
    markAsPaid: false
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (payment) {
      setFormData({
        member_id: payment.member_id || '',
        amount: payment.amount?.toString() || '',
        category: payment.category || '',
        observation: payment.observation || '',
        due_date: payment.due_date ? toDateString(payment.due_date) : '',
        status: payment.status || 'pending',
        markAsPaid: false
      });
    } else {
      // Para novo pagamento, definir data de vencimento padrão como hoje
      const today = new Date();
      setFormData(prev => ({
        ...prev,
        due_date: toDateString(today)
      }));
    }
  }, [payment]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Categoria é obrigatória';
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Data de vencimento é obrigatória';
    }

    // Deve sempre ter um atleta associado (só mensalidades)
    if (!formData.member_id) {
      newErrors.member_id = 'Selecione um atleta';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name === 'amount') {
      // Permitir apenas números e vírgula/ponto decimal
      const numericValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else if (name === 'status') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData = {
        member_id: parseInt(formData.member_id),
        amount: parseFloat(formData.amount),
        category: formData.category.trim(),
        observation: formData.observation.trim() || null,
        due_date: formData.due_date,
        status: formData.status,
        paid_at: null
      };

      // Se marcou como pago, definir paid_at
      if (formData.markAsPaid) {
        submitData.paid_at = new Date().toISOString();
        submitData.status = 'paid';
      }

      await onSubmit(submitData);
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {payment ? 'Editar Pagamento' : 'Nova Mensalidade'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {payment ? 'Atualize as informações do pagamento' : 'Registre uma nova mensalidade ou taxa do atleta'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo de Pagamento */}
        <div>
          <label className="label">Status *</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="input"
          >
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
          </select>
        </div>

        {/* Atleta */}
        <div>
          <label htmlFor="member_id" className="label">
            Atleta *
          </label>
          <select
            id="member_id"
            name="member_id"
            value={formData.member_id}
            onChange={handleChange}
            className={`input ${errors.member_id ? 'border-danger-300 focus:ring-danger-500' : ''}`}
          >
            <option value="">Selecione um atleta</option>
            {members.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {errors.member_id && (
            <p className="mt-1 text-sm text-danger-600">{errors.member_id}</p>
          )}
        </div>

        {/* Valor */}
        <div>
          <label htmlFor="amount" className="label">
            Valor (R$) *
          </label>
          <input
            type="text"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className={`input ${errors.amount ? 'border-danger-300 focus:ring-danger-500' : ''}`}
            placeholder="0,00"
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-danger-600">{errors.amount}</p>
          )}
        </div>

        {/* Categoria */}
        <div>
          <label htmlFor="category" className="label">
            Categoria *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`input ${errors.category ? 'border-danger-300 focus:ring-danger-500' : ''}`}
          >
            <option value="">Selecione uma categoria</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-danger-600">{errors.category}</p>
          )}
        </div>

        {/* Data de Vencimento */}
        <div>
          <label htmlFor="due_date" className="label">
            Data de Vencimento *
          </label>
          <input
            type="date"
            id="due_date"
            name="due_date"
            value={formData.due_date}
            onChange={handleChange}
            className={`input ${errors.due_date ? 'border-danger-300 focus:ring-danger-500' : ''}`}
          />
          {errors.due_date && (
            <p className="mt-1 text-sm text-danger-600">{errors.due_date}</p>
          )}
        </div>

        {/* Observação */}
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
            placeholder="Informações adicionais..."
            maxLength={500}
          />
          <p className="mt-1 text-sm text-gray-500">
            {formData.observation.length}/500 caracteres
          </p>
        </div>

        {/* Marcar como Pago (apenas para receitas pendentes) */}
        {!payment && formData.status === 'pending' && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="markAsPaid"
              name="markAsPaid"
              checked={formData.markAsPaid}
              onChange={handleChange}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="markAsPaid" className="ml-2 text-sm text-gray-700">
              Marcar como pago imediatamente
            </label>
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
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              payment ? 'Atualizar' : 'Adicionar'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
