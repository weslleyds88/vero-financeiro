import React, { useState, useEffect } from 'react';

const MemberForm = ({ member, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    observation: '',
    position: '',
    birth_date: '',
    rg: '',
    region: '',
    gender: '',
    responsible_name: '',
    responsible_phone: '',
    avatar_url: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      // Formatar birth_date para o input type="date" (YYYY-MM-DD)
      let formattedBirthDate = '';
      if (member.birth_date) {
        // Se já está no formato correto, usar direto
        if (typeof member.birth_date === 'string' && member.birth_date.match(/^\d{4}-\d{2}-\d{2}/)) {
          formattedBirthDate = member.birth_date.split('T')[0]; // Remove hora se houver
        } else {
          // Tentar converter de outros formatos
          try {
            const date = new Date(member.birth_date);
            if (!isNaN(date.getTime())) {
              formattedBirthDate = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn('Erro ao formatar data de nascimento:', e);
          }
        }
      }

      setFormData({
        full_name: member.full_name || member.name || '',
        phone: member.phone || '',
        observation: member.observation || '',
        position: member.position || '',
        birth_date: formattedBirthDate,
        rg: member.rg || '',
        region: member.region || '',
        gender: member.gender || '',
        responsible_name: member.responsible_name || '',
        responsible_phone: member.responsible_phone || '',
        avatar_url: member.avatar_url || ''
      });
    }
  }, [member]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nome é obrigatório';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Formato de telefone inválido';
    }
    if (formData.responsible_phone && !isValidPhone(formData.responsible_phone)) {
      newErrors.responsible_phone = 'Telefone do responsável inválido';
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
    
    if (name === 'phone' || name === 'responsible_phone') {
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
        name: formData.full_name.trim(),
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        observation: formData.observation.trim() || null,
        position: formData.position.trim() || null,
        birth_date: formData.birth_date || null,
        rg: formData.rg.trim() || null,
        region: formData.region.trim() || null,
        gender: formData.gender || null,
        responsible_name: formData.responsible_name.trim() || null,
        responsible_phone: formData.responsible_phone.trim() || null,
        avatar_url: formData.avatar_url.trim() || null
      });
    } catch (error) {
      console.error('Erro ao salvar atleta:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {member ? 'Editar Atleta' : 'Novo Atleta'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {member ? 'Atualize as informações do atleta' : 'Adicione um novo atleta ao time'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="full_name" className="label">
            Nome do Atleta *
          </label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className={`input ${errors.full_name ? 'border-danger-300 focus:ring-danger-500' : ''}`}
            placeholder="Nome completo do atleta"
            maxLength={255}
          />
          {errors.full_name && (
            <p className="mt-1 text-sm text-danger-600">{errors.full_name}</p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Posição</label>
            <input type="text" name="position" value={formData.position} onChange={handleChange} className="input" placeholder="Levantador, Oposto, ..." />
          </div>
          <div>
            <label className="label">Data de Nascimento</label>
            <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="input" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">RG</label>
            <input type="text" name="rg" value={formData.rg} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="label">Região (SP)</label>
            <input type="text" name="region" value={formData.region} onChange={handleChange} className="input" />
          </div>
        </div>

        <div>
          <label className="label">Gênero</label>
          <select name="gender" value={formData.gender} onChange={handleChange} className="input">
            <option value="">Não informar</option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
            <option value="other">Outro</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Responsável (Nome)</label>
            <input type="text" name="responsible_name" value={formData.responsible_name} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="label">Responsável (Telefone)</label>
            <input type="text" name="responsible_phone" value={formData.responsible_phone} onChange={handleChange} className={`input ${errors.responsible_phone ? 'border-danger-300 focus:ring-danger-500' : ''}`} placeholder="(11) 99999-9999" maxLength={15} />
            {errors.responsible_phone && (
              <p className="mt-1 text-sm text-danger-600">{errors.responsible_phone}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label">Foto (URL)</label>
          <input type="text" name="avatar_url" value={formData.avatar_url} onChange={handleChange} className="input" placeholder="https://..." />
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
            placeholder="Observações gerais sobre o atleta..."
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
