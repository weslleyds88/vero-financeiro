import React, { useState, useEffect } from 'react';

const MemberForm = ({ member, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    observation: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        phone: member.phone || '',
        observation: member.observation || ''
      });
    }
  }, [member]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Formato de telefone inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidPhone = (phone) => {
    // Regex simples para telefone brasileiro
    const phoneRegex = /^(\(\d{2}\)\s?|\d{2}\s?)?\d{4,5}-?\d{4}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const formatPhone = (value) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a máscara (11) 99999-9999
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      setFormData(prev => ({
        ...prev,
        [name]: formatPhone(value)
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
      await onSubmit({
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        observation: formData.observation.trim() || null
      });
    } catch (error) {
      console.error('Erro ao salvar sócio:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome do Atleta *
        </label>
        <h3 className="text-lg font-medium text-gray-900">
          {member ? 'Editar Atleta' : 'Novo Atleta'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {member ? 'Atualize as informações do atleta' : 'Adicione um novo atleta ao time'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="label">
            Nome do Atleta *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`input ${errors.name ? 'border-danger-300 focus:ring-danger-500' : ''}`}
            placeholder="Nome completo do atleta"
            maxLength={255}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-danger-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Telefone
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={`input ${errors.phone ? 'border-danger-300 focus:ring-danger-500' : ''}`}
            placeholder="(11) 99999-9999"
            maxLength={15}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-danger-600">{errors.phone}</p>
          )}
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
            placeholder="Posição no time, observações gerais..."
            maxLength={500}
          />
          <p className="mt-1 text-sm text-gray-500">
            {formData.observation.length}/500 caracteres
          </p>
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
              member ? 'Atualizar Atleta' : 'Adicionar Atleta'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MemberForm;
