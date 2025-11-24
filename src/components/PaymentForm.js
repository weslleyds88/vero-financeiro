import React, { useState, useEffect } from 'react';
import { toDateString } from '../utils/dateUtils';

const PaymentForm = ({ payment, members, categories, groups = [], onSubmit, onCancel, supabase, currentUser }) => {
  const [formData, setFormData] = useState({
    group_id: '',
    amount: '',
    category: '',
    observation: '',
    due_date: '',
    status: 'pending',
    markAsPaid: false,
    pix_key: '',
    pix_name: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (payment) {
      setFormData({
        group_id: payment.group_id || '',
        amount: payment.amount?.toString() || '',
        category: payment.category || '',
        observation: payment.observation || '',
        due_date: payment.due_date ? toDateString(payment.due_date) : '',
        status: payment.status || 'pending',
        markAsPaid: false,
        pix_key: payment.pix_key || '',
        pix_name: payment.pix_name || ''
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

    if (!formData.group_id) {
      newErrors.group_id = 'Selecione um grupo';
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
        amount: parseFloat(formData.amount),
        category: formData.category.trim(),
        due_date: formData.due_date,
        status: formData.status,
        observation: formData.observation.trim() || null,
        paid_at: formData.markAsPaid ? new Date().toISOString() : null,
        pix_key: formData.pix_key.trim() || null,
        pix_name: formData.pix_name.trim() || null
      };

      // Buscar membros do grupo
      const { data: groupMembers, error: membersError } = await supabase
        .from('user_group_members')
        .select('user_id')
        .eq('group_id', formData.group_id);

      if (membersError) throw membersError;

      if (!groupMembers || groupMembers.length === 0) {
        throw new Error('Grupo não possui membros');
      }

      // MODO EDIÇÃO: Detectar se já existe pagamento (tem ID)
      if (payment && payment.id) {
        console.log('✏️ MODO EDIÇÃO DETECTADO - Payment ID:', payment.id);
        
        // Buscar todos os pagamentos do grupo com mesmos parâmetros
        const { data: existingGroupPayments, error: searchError } = await supabase
          .from('payments')
          .select('id')
          .eq('group_id', formData.group_id)
          .eq('category', payment.category)
          .eq('due_date', payment.due_date)
          .eq('amount', payment.amount);

        if (searchError) throw searchError;

        console.log('📋 Pagamentos do grupo encontrados:', existingGroupPayments.length);

        // Atualizar todos os pagamentos do grupo
        for (const groupPayment of existingGroupPayments) {
          const { error: updateError } = await supabase
            .from('payments')
            .update(submitData)
            .eq('id', groupPayment.id);

          if (updateError) {
            console.error('❌ Erro ao atualizar pagamento:', groupPayment.id, updateError);
            throw updateError;
          }
        }

        console.log('✅ Todos os', existingGroupPayments.length, 'pagamentos do grupo foram atualizados');
        onSubmit(submitData);

      // MODO CRIAÇÃO: Criar novos pagamentos
      } else {
        const paymentsToCreate = groupMembers.map(member => ({
          ...submitData,
          member_id: member.user_id,
          group_id: formData.group_id
        }));

        console.log('➕ MODO CRIAÇÃO: Criando', paymentsToCreate.length, 'pagamentos novos');
        console.log('📋 Membros do grupo:', groupMembers);
        console.log('📊 Dados dos pagamentos a criar:', paymentsToCreate);

        // Inserir todos os pagamentos
        const { error: insertError } = await supabase
          .from('payments')
          .insert(paymentsToCreate);

        if (insertError) throw insertError;

        console.log('✅ Pagamentos de grupo criados com sucesso');
        
        // Criar notificações apenas para membros que NÃO são admins
        try {
          // Buscar o role de cada membro
          const memberIds = groupMembers.map(m => m.user_id);
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, role')
            .in('id', memberIds);

          if (profileError) {
            console.warn('⚠️ Erro ao buscar profiles:', profileError);
          }

          // Filtrar apenas membros que não são admins
          const nonAdminMembers = groupMembers.filter(member => {
            const profile = profiles?.find(p => p.id === member.user_id);
            return profile?.role !== 'admin';
          });

          if (nonAdminMembers.length > 0) {
            const notifications = nonAdminMembers.map(member => ({
              user_id: member.user_id,
              title: 'Nova Cobrança Recebida',
              message: `Nova cobrança de ${submitData.category}: R$ ${submitData.amount.toFixed(2)} - Vencimento: ${new Date(submitData.due_date).toLocaleDateString('pt-BR')}`,
              type: 'info'
            }));

            await supabase
              .from('notifications')
              .insert(notifications);
            
            console.log('✅ Notificações de nova cobrança enviadas para', nonAdminMembers.length, 'atletas (admins filtrados)');
          } else {
            console.log('ℹ️ Nenhuma notificação enviada (todos os membros são admins)');
          }
        } catch (notifError) {
          console.warn('⚠️ Erro ao criar notificações (não crítico):', notifError);
        }
        
        onSubmit(submitData);
      }
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
      
      // Mensagem mais clara para o usuário
      if (error.message.includes('duplicate') || error.code === '23505') {
        alert('Erro: Já existe uma cobrança com estes dados para este grupo. Tente editar a cobrança existente.');
      } else {
        alert('Erro ao salvar pagamento: ' + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {payment ? 'Editar Pagamento' : 'Nova Cobrança por Grupo'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {payment ? 'Atualize as informações do pagamento' : 'Registre uma nova cobrança para todos os membros do grupo'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Seleção de Grupo */}
        <div>
          <label htmlFor="group_id" className="label">
            Grupo *
          </label>
          <select
            id="group_id"
            name="group_id"
            value={formData.group_id}
            onChange={handleChange}
            className={`input ${errors.group_id ? 'border-danger-300 focus:ring-danger-500' : ''}`}
          >
            <option value="">Selecione um grupo</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.type})
              </option>
            ))}
          </select>
          {errors.group_id && (
            <p className="mt-1 text-sm text-danger-600">{errors.group_id}</p>
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

        {/* Dados do PIX */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Dados para Pagamento PIX
          </h4>
          <div className="space-y-3">
            <div>
              <label htmlFor="pix_key" className="label text-sm">
                Chave PIX (será exibida para os atletas)
              </label>
              <input
                type="text"
                id="pix_key"
                name="pix_key"
                value={formData.pix_key}
                onChange={handleChange}
                className="input"
                placeholder="Ex: (99) 99999-9999 ou email@exemplo.com"
              />
              <p className="mt-1 text-xs text-gray-500">Celular, email, CPF ou chave aleatória</p>
            </div>
            <div>
              <label htmlFor="pix_name" className="label text-sm">
                Nome do Recebedor (será exibido para os atletas)
              </label>
              <input
                type="text"
                id="pix_name"
                name="pix_name"
                value={formData.pix_name}
                onChange={handleChange}
                className="input"
                placeholder="Ex: João Silva ou Associação Vero"
              />
              <p className="mt-1 text-xs text-gray-500">Nome que aparecerá para os atletas</p>
            </div>
          </div>
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
            className="input"
            rows="3"
            placeholder="Adicione uma observação (opcional)"
          />
        </div>

        {/* Marcar como Pago */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="markAsPaid"
            name="markAsPaid"
            checked={formData.markAsPaid}
            onChange={handleChange}
            className="mr-2"
          />
          <label htmlFor="markAsPaid" className="text-sm">
            Marcar como pago imediatamente
          </label>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Cobrança'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
