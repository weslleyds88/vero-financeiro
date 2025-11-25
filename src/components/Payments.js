import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PaymentForm from './PaymentForm';
import PaymentProofModal from './PaymentProofModal';
import PaymentProofReview from './PaymentProofReview';
import SelectPaymentModal from './SelectPaymentModal';
import ExportButtons from './ExportButtons';
import Notifications from './Notifications';
import { formatDate, formatCurrency } from '../utils/dateUtils';

const Payments = ({ db, members, payments, onRefresh, isAdmin, supabase, currentUser }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [groups, setGroups] = useState([]);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedPaymentForProof, setSelectedPaymentForProof] = useState(null);
  const [showProofReview, setShowProofReview] = useState(false);
  const [showSelectPaymentModal, setShowSelectPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' ou 'summary'
  
  // Estados para o Resumo por Atleta
  const [summarySearchTerm, setSummarySearchTerm] = useState('');
  const [summaryYear, setSummaryYear] = useState('all'); // 'all' ou '2024', '2025', etc.
  const [summaryGroup, setSummaryGroup] = useState('all'); // 'all' ou ID do grupo
  
  // Estados para filtros da Lista de Pagamentos
  const [listMonth, setListMonth] = useState('all'); // 'all' ou '0' a '11'
  const [listYear, setListYear] = useState('all'); // 'all' ou '2024', '2025', etc.
  const [listStatus, setListStatus] = useState('all'); // 'all', 'paid', 'pending'

  const categories = [
    'Mensalidade',
    'Uniforme',
    'Taxa de Inscrição',
    'Taxa de Competição',
    'Taxa de Arbitragem',
    'Material Esportivo',
    'Transporte',
    'Alimentação',
    'Taxa de Quadra',
    'Taxa de Torneio',
    'Outros'
  ];

  // Carregar grupos
  const loadGroups = useCallback(async () => {
    try {
      if (!supabase) return;
      const { data: groupsData, error: groupsError } = await supabase
        .from('user_groups')
        .select('*')
        .order('name');

      if (groupsError) {
        console.error('Erro ao buscar grupos:', groupsError);
        setGroups([]);
        return;
      }

      setGroups(groupsData || []);

    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      setGroups([]);
    }
  }, [supabase]);

  useEffect(() => {
    if (supabase) {
      loadGroups();
    }
  }, [loadGroups, supabase]);

  // Filtrar pagamentos baseado na visão (admin vs atleta)
  const filteredPayments = useMemo(() => payments.filter(p => {
    // Filtrar apenas pagamentos de atletas (que têm member_id)
    if (!p.member_id || p.status === 'expense') return false;

    // Se não for admin, mostrar apenas pagamentos do atleta atual
    if (!isAdmin && currentUser) {
      const isUserPayment = p.member_id && p.member_id === currentUser.id;
      return !!isUserPayment;
    }

    // Admin vê todos os pagamentos
    return true;
  }), [payments, isAdmin, currentUser]);

  // Aplicar filtros na lista de pagamentos
  const listFilteredPayments = useMemo(() => filteredPayments.filter(p => {
    // Filtro de status (sempre aplicado)
    if (listStatus !== 'all') {
      if (listStatus === 'paid' && p.status !== 'paid') return false;
      if (listStatus === 'pending' && p.status === 'paid') return false;
    }
    
    // Filtros de mês e ano (apenas para admin)
    if (isAdmin) {
      // Filtrar por mês
      if (listMonth !== 'all' && p.due_date) {
        const paymentMonth = new Date(p.due_date).getMonth();
        if (paymentMonth !== parseInt(listMonth)) return false;
      }
      
      // Filtrar por ano
      if (listYear !== 'all' && p.due_date) {
        const paymentYear = new Date(p.due_date).getFullYear().toString();
        if (paymentYear !== listYear) return false;
      }
    }

    return true;
  }), [filteredPayments, listStatus, isAdmin, listMonth, listYear]);

  const sortedAndFilteredPayments = useMemo(() => listFilteredPayments.map(payment => {
    // Para admin, se for pagamento de grupo, calcular valor total
    if (isAdmin && payment.group_id && payment.member_id) {
      // Buscar TODOS os pagamentos do grupo (não apenas os filtrados)
      const allGroupPayments = payments.filter(p =>
        p.group_id === payment.group_id &&
        p.category === payment.category &&
        parseFloat(p.amount || 0) === parseFloat(payment.amount || 0) &&
        p.due_date === payment.due_date
      );

      // Se tem group_id, é pagamento de grupo (mesmo com 1 pessoa)
      if (allGroupPayments.length >= 1) {
        // Este é um pagamento de grupo - mostrar apenas o primeiro como representativo
        const firstPayment = allGroupPayments.sort((a, b) => {
          const aId = a.member_id?.toString() || '';
          const bId = b.member_id?.toString() || '';
          return aId.localeCompare(bId);
        })[0];
        
        if (payment.id === firstPayment.id) {
          // A contagem correta de membros é o próprio length dos pagamentos do grupo
          const groupMemberCount = allGroupPayments.length;

          // Calcular valores pagos vs pendentes do grupo (incluindo parciais)
          const paidAmount = allGroupPayments
            .reduce((sum, p) => {
              // Somar o paid_amount de cada pagamento (para pagamentos parciais)
              // ou amount completo se status for 'paid'
              const paid = p.status === 'paid' 
                ? parseFloat(p.amount || 0) 
                : parseFloat(p.paid_amount || 0);
              return sum + paid;
            }, 0);

          const totalGroupValue = groupMemberCount * parseFloat(payment.amount || 0);
          const pendingAmount = totalGroupValue - paidAmount;

          // Buscar nome do grupo
          const group = groups.find(g => g.id === payment.group_id);
          const groupName = group ? group.name : 'Grupo';

          // Calcular status correto do grupo baseado no total
          let groupStatus;
          if (paidAmount >= totalGroupValue) {
            groupStatus = 'paid'; // 100% pago
          } else if (paidAmount > 0) {
            groupStatus = 'pending'; // Parcialmente pago = Pendente
          } else {
            groupStatus = 'pending'; // Não pago = Pendente
          }

          return {
            ...payment,
            status: groupStatus,
            displayAmount: totalGroupValue,
            paidAmount: paidAmount,
            pendingAmount: pendingAmount,
            groupMemberCount: groupMemberCount,
            isGroupPayment: true,
            groupPayments: allGroupPayments, // Manter referência para ações
            groupName: groupName // Nome do grupo para exibição
          };
        } else {
          // Este não é o primeiro pagamento do grupo, ignorar
          return null;
        }
      }
    }

    // Buscar nome do grupo para pagamentos individuais também
    const group = payment.group_id ? groups.find(g => g.id === payment.group_id) : null;
    const groupName = group ? group.name : null;

    return {
      ...payment,
      displayAmount: parseFloat(payment.amount || 0),
      isGroupPayment: false,
      groupName: groupName
    };
  }).filter(payment => payment !== null).sort((a, b) => {
    const memberA = members.find(m => m.id === a.member_id);
    const memberB = members.find(m => m.id === b.member_id);
    const nameA = memberA && (memberA.full_name || memberA.name) ? (memberA.full_name || memberA.name).toLowerCase() : '';
    const nameB = memberB && (memberB.full_name || memberB.name) ? (memberB.full_name || memberB.name).toLowerCase() : '';

      return nameA.localeCompare(nameB);
  }), [listFilteredPayments, isAdmin, payments, members, groups]);

  const handleAddPayment = () => {
    if (!isAdmin) {
      return;
    }
    setEditingPayment(null);
    setShowForm(true);
  };

  const handleEditPayment = (payment) => {
    if (!isAdmin) {
      return;
    }

    // Se for pagamento de grupo, precisamos modificar o objeto para edição
    if (payment.isGroupPayment && payment.groupPayments) {
      // Criar um objeto representativo do grupo para edição
      const groupPayment = {
        ...payment,
        id: payment.groupPayments[0].id, // Usar o ID do primeiro pagamento para edição
        member_id: null, // Indicar que é um pagamento de grupo
        group_id: payment.group_id,
        amount: payment.amount,
        category: payment.category,
        due_date: payment.due_date,
        observation: payment.observation
      };

      setEditingPayment(groupPayment);
      setShowForm(true);
    } else {
      // Pagamento individual normal
    setEditingPayment(payment);
    setShowForm(true);
    }
  };

  const handleSyncGroupPayments = async (payment) => {
    if (!payment.isGroupPayment || !payment.groupPayments || !supabase) return;

    try {
      // Buscar membros atuais do grupo
      const { data: currentMembers, error: membersError } = await supabase
        .from('user_group_members')
        .select('user_id')
        .eq('group_id', payment.group_id);

      if (membersError) throw membersError;

      const currentMemberIds = currentMembers.map(m => m.user_id);
      const existingMemberIds = payment.groupPayments.map(p => p.member_id);

      // 1️⃣ ADICIONAR: Membros que NÃO têm pagamento ainda
      const newMembers = currentMembers.filter(m => !existingMemberIds.includes(m.user_id));
      
      // 2️⃣ REMOVER: Pagamentos de pessoas que NÃO estão mais no grupo
      const paymentsToRemove = payment.groupPayments.filter(p => !currentMemberIds.includes(p.member_id));

      let changes = [];

      // Criar/Reintegrar pagamentos para novos membros
      if (newMembers.length > 0) {
        let reintegratedCount = 0;
        let createdCount = 0;
        const paymentsToCreate = [];
        const paymentsToReintegrate = [];

        // Para cada novo membro, verificar se existe pagamento órfão DO MESMO GRUPO
        for (const member of newMembers) {
          // Buscar pagamento órfão (group_id = null) com mesma categoria, valor e vencimento
          const { data: orphanPayments, error: orphanError } = await supabase
            .from('payments')
            .select('*')
            .eq('member_id', member.user_id)
            .is('group_id', null)
            .eq('category', payment.category)
            .eq('amount', parseFloat(payment.amount))
            .eq('due_date', payment.due_date)
            .order('created_at', { ascending: false });

          if (orphanError) {
            console.warn('Erro ao buscar pagamento órfão:', orphanError);
          }

          // Se encontrou pagamento órfão, verificar se é do MESMO grupo original
          let orphanToReintegrate = null;
          
          if (orphanPayments && orphanPayments.length > 0) {
            // Procurar por pagamento órfão que seja DO MESMO GRUPO
            for (const orphan of orphanPayments) {
              const observation = orphan.observation || '';
              
              // Verificar se a observação contém o ID do grupo original
              if (observation.includes(`ID original: ${payment.group_id}`)) {
                orphanToReintegrate = orphan;
                break;
              }
            }
          }

          // Se encontrou pagamento órfão DO MESMO GRUPO, reintegrar
          if (orphanToReintegrate) {
            paymentsToReintegrate.push({
              id: orphanToReintegrate.id,
              status: orphanToReintegrate.status
            });
      } else {
            // Não encontrou órfão DO MESMO GRUPO, criar novo pagamento
            paymentsToCreate.push({
              amount: parseFloat(payment.amount),
              category: payment.category,
              due_date: payment.due_date,
              status: 'pending',
              observation: payment.observation,
              member_id: member.user_id,
              group_id: payment.group_id,
              pix_key: payment.pix_key || null,
              pix_name: payment.pix_name || null
            });
          }
        }

        // Reintegrar pagamentos órfãos
        if (paymentsToReintegrate.length > 0) {
          for (const orphanPayment of paymentsToReintegrate) {
            const { error: updateError } = await supabase
              .from('payments')
              .update({ 
                group_id: payment.group_id,
                observation: 'Atleta reintegrado ao grupo'
              })
              .eq('id', orphanPayment.id);

            if (updateError) {
              console.error('Erro ao reintegrar pagamento:', updateError);
            } else {
              reintegratedCount++;
            }
          }
        }

        // Criar novos pagamentos
        if (paymentsToCreate.length > 0) {
          const { error: insertError } = await supabase
            .from('payments')
            .insert(paymentsToCreate);

          if (insertError) throw insertError;
          
          createdCount = paymentsToCreate.length;
        }

        // Criar notificações para TODOS os novos membros (reintegrados ou novos)
        try {
          const memberIds = newMembers.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, role')
            .in('id', memberIds);

          const nonAdminMembers = newMembers.filter(member => {
            const profile = profiles?.find(p => p.id === member.user_id);
            return profile?.role !== 'admin';
          });

          if (nonAdminMembers.length > 0) {
            const notifications = nonAdminMembers.map(member => ({
              user_id: member.user_id,
              title: 'Nova Cobrança Recebida',
              message: `Nova cobrança de ${payment.category}: R$ ${parseFloat(payment.amount).toFixed(2)} - Vencimento: ${new Date(payment.due_date).toLocaleDateString('pt-BR')}`,
              type: 'info'
            }));

            await supabase
              .from('notifications')
              .insert(notifications);
          }
        } catch (notifError) {
          console.warn('Erro ao criar notificações (não crítico):', notifError);
        }

        let addMessage = `➕ ${newMembers.length} atleta(s) adicionado(s)`;
        if (reintegratedCount > 0) {
          addMessage += ` (${reintegratedCount} reintegrado(s) com histórico preservado)`;
        }
        if (createdCount > 0 && reintegratedCount > 0) {
          addMessage += ` (${createdCount} novo(s))`;
        }
        changes.push(addMessage);
      }

      // Remover pagamentos de membros que saíram do grupo
      if (paymentsToRemove.length > 0) {
        // Verificar se algum já foi pago
        const paidPayments = paymentsToRemove.filter(p => p.status === 'paid');
        
        if (paidPayments.length > 0) {
          const confirmMsg = `⚠️ ATENÇÃO: ${paidPayments.length} atleta(s) que saiu/saíram do grupo já tinha(m) pagamento APROVADO.\n\nDeseja realmente remover do grupo?\n\n✅ Pagamentos COM ticket: Serão desassociados do grupo mas PRESERVADOS no histórico\n🗑️ Pagamentos SEM ticket: Serão completamente removidos`;
          
          if (!window.confirm(confirmMsg)) {
            if (newMembers.length > 0) {
              alert(changes.join('\n'));
              await onRefresh();
            }
      return;
    }
        }

        const paymentIdsToRemove = paymentsToRemove.map(p => p.id);
        
        // PASSO 1: Verificar se há tickets relacionados (para preservá-los)
        const { data: relatedTickets } = await supabase
          .from('payment_tickets')
          .select('id, payment_id')
          .in('payment_id', paymentIdsToRemove);

        const paymentsWithTickets = relatedTickets?.map(t => t.payment_id) || [];
        const paymentsWithoutTickets = paymentIdsToRemove.filter(id => !paymentsWithTickets.includes(id));

        // PASSO 2: Para pagamentos COM tickets, apenas desassociar do grupo (manter histórico)
        if (paymentsWithTickets.length > 0) {
          for (const paymentId of paymentsWithTickets) {
            await supabase
              .from('payments')
              .update({ 
                group_id: null,
                observation: `Atleta removido do grupo (ID original: ${payment.group_id}) - histórico preservado`
              })
              .eq('id', paymentId);
          }
        }

        // PASSO 3: Para pagamentos SEM tickets, deletar comprovantes e pagamentos
        if (paymentsWithoutTickets.length > 0) {
          // Deletar comprovantes PRIMEIRO
          await supabase
            .from('payment_proofs')
            .delete()
            .in('payment_id', paymentsWithoutTickets);

          // Deletar pagamentos
          const { error: deleteError } = await supabase
            .from('payments')
            .delete()
            .in('id', paymentsWithoutTickets);

          if (deleteError) throw deleteError;
        }

        let removalMsg = `➖ ${paymentsToRemove.length} atleta(s) removido(s)`;
        if (paymentsWithTickets.length > 0) {
          removalMsg += ` (${paymentsWithTickets.length} com ticket preservado para histórico)`;
        }
        changes.push(removalMsg);
      }

      if (changes.length === 0) {
        alert('✅ Grupo já está sincronizado! Nenhuma alteração necessária.');
    } else {
        alert('✅ Sincronização concluída!\n\n' + changes.join('\n'));
      }
      
      await onRefresh();
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      alert('Erro ao sincronizar: ' + error.message);
    }
  };

  // Sincronizar todos os grupos de uma vez (admin)
  const handleSyncAllGroupPayments = async () => {
    if (!isAdmin || !supabase) {
      return;
    }

    // Pegar somente os pagamentos representativos de grupo (linha consolidada)
    const groupsToSync = sortedAndFilteredPayments.filter(p => p.isGroupPayment && p.groupPayments && p.groupPayments.length > 0);

    if (groupsToSync.length === 0) {
      alert('Não há grupos para sincronizar no filtro atual.');
      return;
    }

    const confirmMsg = `Sincronizar todos os ${groupsToSync.length} grupo(s) visíveis?\n\nIsto irá:\n• Adicionar novos atletas que entraram no grupo\n• Remover/desassociar atletas que saíram\n• Preservar histórico quando existir ticket aprovado`;
    if (!window.confirm(confirmMsg)) return;

    try {
      for (const groupPayment of groupsToSync) {
        await handleSyncGroupPayments(groupPayment);
      }
      await onRefresh();
      alert('✅ Sincronização em massa concluída!');
    } catch (error) {
      console.error('Erro na sincronização em massa:', error);
      alert('Erro na sincronização em massa: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleDeletePayment = async (id) => {
    if (!isAdmin) {
      return;
    }

    // Verificar se é um pagamento de grupo
    const payment = sortedAndFilteredPayments.find(p => p.id === id);
    if (!payment) {
      alert('Pagamento não encontrado');
      return;
    }

    let paymentIdsToDelete = [id];
    let message = 'Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.';

    // Se for pagamento de grupo, incluir todos os pagamentos do grupo
    if (payment.isGroupPayment && payment.groupPayments) {
      paymentIdsToDelete = payment.groupPayments.map(p => p.id);
      message = `Tem certeza que deseja excluir este pagamento de grupo? Esta ação excluirá os pagamentos de ${payment.groupPayments.length} atletas e não pode ser desfeita.`;
    }

    if (window.confirm(message)) {
      try {
        // Excluir todos os pagamentos do grupo
        for (const paymentId of paymentIdsToDelete) {
          const success = await db.deletePayment(paymentId);
          if (!success) {
            throw new Error(`Erro ao excluir pagamento ${paymentId}`);
          }
        }

        onRefresh();
      } catch (error) {
        console.error('Erro na exclusão:', error);
        if (error.message?.includes('comprovantes') || error.message?.includes('notificações')) {
          alert('💡 Dica: Os dados relacionados foram removidos automaticamente. Os pagamentos foram excluídos com sucesso!');
      onRefresh();
    } else {
          alert('Erro ao excluir pagamento(s): ' + (error.message || 'Erro desconhecido'));
        }
      }
    }
  };

  const handleMarkPaid = async (paymentId) => {
    if (!isAdmin) {
      return;
    }

    // Verificar se é um pagamento de grupo
    const payment = sortedAndFilteredPayments.find(p => p.id === paymentId);
    if (!payment) {
      alert('Pagamento não encontrado');
      return;
    }

    let paymentIdsToMark = [paymentId];
    let message = 'Marcar este pagamento como pago?';

    // Se for pagamento de grupo, incluir todos os pagamentos do grupo
    if (payment.isGroupPayment && payment.groupPayments) {
      paymentIdsToMark = payment.groupPayments.map(p => p.id);
      message = `Marcar este pagamento de grupo como pago? Esta ação marcará como pagos os pagamentos de ${payment.groupPayments.length} atletas.`;
    }

    if (window.confirm(message)) {
      try {
        // Marcar todos os pagamentos do grupo como pagos
        const success = await db.markPaidBulk(paymentIdsToMark);
        if (success) {
          onRefresh();
    } else {
          alert('Erro ao marcar pagamento(s) como pago(s)');
        }
      } catch (error) {
        console.error('Erro ao marcar como pago:', error);
        alert('Erro ao marcar pagamento(s) como pago(s): ' + (error.message || 'Erro desconhecido'));
      }
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', label: 'Pendente' },
      partial: { class: 'status-pending', label: 'Pendente' },
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

  const handleFormSubmit = async (paymentData) => {
    setShowForm(false);
    setEditingPayment(null);
    await onRefresh();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingPayment(null);
  };

  const handleUploadProof = (payment) => {
    setSelectedPaymentForProof(payment);
    setShowProofModal(true);
  };

  const handleProofModalClose = () => {
    setShowProofModal(false);
    setSelectedPaymentForProof(null);
    onRefresh();
  };

  const handleProofReviewClose = () => {
    setShowProofReview(false);
    onRefresh();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Pagamentos dos Atletas' : 'Minhas Cobranças'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isAdmin
              ? 'Gerencie mensalidades e taxas dos atletas'
              : 'Visualize suas mensalidades e taxas'
            }
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {currentUser && supabase && (
            <Notifications
              supabase={supabase}
              currentUser={currentUser}
              isVisible={true}
            />
          )}
          {isAdmin && (
            <>
              <button
                onClick={handleSyncAllGroupPayments}
                className="bg-purple-100 hover:bg-purple-200 text-purple-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                title="Sincronizar todos os grupos visíveis"
              >
                🔄 Sincronizar Todos
              </button>
              <button
                onClick={() => setShowProofReview(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                📋 Revisar Comprovantes
              </button>
          <ExportButtons 
            members={members}
            payments={filteredPayments}
            db={db}
                currentMonth={null}
          />
          <button
            onClick={handleAddPayment}
                className="btn btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
                Gerar Cobrança
          </button>
            </>
          )}
        </div>
      </div>

      {/* Botão de ação para Atletas */}
      {!isAdmin && filteredPayments.filter(p => p.status !== 'paid').length > 0 && (
        <div className="mb-6">
              <button
            onClick={() => setShowSelectPaymentModal(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-3"
              >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            <span>💳 Cadastrar Pagamento</span>
              </button>
          <p className="text-sm text-gray-500 text-center mt-2">
            Você tem {filteredPayments.filter(p => p.status !== 'paid').length} pagamento(s) pendente(s)
          </p>
        </div>
      )}

      {/* Abas - Apenas para Admin */}
      {isAdmin && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
              <button
              onClick={() => setActiveTab('list')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'list'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📋 Lista de Pagamentos
              </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'summary'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 Resumo por Atleta
            </button>
          </nav>
          </div>
      )}

      {/* Conteúdo da Aba: Lista de Pagamentos */}
      {(activeTab === 'list' || !isAdmin) && (
        <>
          {/* Filtros da Lista de Pagamentos */}
          <div className="card p-4 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
              
              {/* Filtro de Status - sempre visível */}
            <select
                value={listStatus}
                onChange={(e) => setListStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">Todos os status</option>
              <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
            </select>

              {/* Filtros de Mês e Ano - apenas para admin */}
              {isAdmin && (
                <>
                  {/* Filtro de Mês */}
            <select
                    value={listMonth}
                    onChange={(e) => setListMonth(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">📅 Todos os meses</option>
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

                  {/* Filtro de Ano */}
            <select
                    value={listYear}
                    onChange={(e) => setListYear(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">📅 Todos os anos</option>
                    {(() => {
                      // Gerar lista de anos disponíveis
                      const years = new Set();
                      payments.forEach(p => {
                        if (p.due_date) {
                          const year = new Date(p.due_date).getFullYear().toString();
                          years.add(year);
                        }
                      });
                      return Array.from(years).sort((a, b) => b.localeCompare(a)).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ));
                    })()}
            </select>
                </>
              )}

              {/* Botão Limpar Filtros */}
              {(listStatus !== 'all' || (isAdmin && (listMonth !== 'all' || listYear !== 'all'))) && (
            <button
                  onClick={() => {
                    setListStatus('all');
                    if (isAdmin) {
                      setListMonth('all');
                      setListYear('all');
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-2"
                >
                  ✕ Limpar filtros
            </button>
              )}
          </div>

            {/* Indicador de Filtros Ativos */}
            {(listStatus !== 'all' || (isAdmin && (listMonth !== 'all' || listYear !== 'all'))) && (
              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="text-blue-800">
                  Mostrando: 
                  {listStatus !== 'all' && <span className="font-medium"> {listStatus === 'paid' ? 'Pago' : 'Pendente'}</span>}
                  {isAdmin && listMonth !== 'all' && <span className="font-medium"> {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][parseInt(listMonth)]}</span>}
                  {isAdmin && listMonth !== 'all' && listYear !== 'all' && ' de'}
                  {isAdmin && listYear !== 'all' && <span className="font-medium"> {listYear}</span>}
                </span>
        </div>
      )}
          </div>

      {/* Lista de Pagamentos */}
      <div className="card">
        {sortedAndFilteredPayments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.isGroupPayment ? (
                            /* ADMIN: Visão de Grupo Consolidado */
                            <div className="flex flex-col">
                              <div className="flex items-center">
                                <span className="text-green-600 font-bold">
                                  {formatCurrency(payment.paidAmount)}
                      </span>
                                <span className="text-gray-400 mx-1">/</span>
                                <span className="text-gray-600">
                                  {formatCurrency(payment.displayAmount)}
                                </span>
                                <span className="text-xs text-blue-600 ml-2">
                                  ({payment.groupMemberCount} atletas)
                                </span>
                              </div>
                              <div className="mt-1">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${payment.displayAmount > 0 ? (payment.paidAmount / payment.displayAmount) * 100 : 0}%`
                                    }}
                                  ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span>
                                    {payment.groupPayments.filter(p => p.status === 'paid').length} pago(s)
                                    {payment.groupPayments.filter(p => p.status === 'pending' && p.paid_amount && parseFloat(p.paid_amount) > 0).length > 0 && (
                                      <span className="text-yellow-600"> + {payment.groupPayments.filter(p => p.status === 'pending' && p.paid_amount && parseFloat(p.paid_amount) > 0).length} parcial(is)</span>
                                    )}
                                  </span>
                                  <span>{payment.pendingAmount > 0 ? formatCurrency(payment.pendingAmount) + ' pendente' : 'Completo'}</span>
                                </div>
                              </div>
                            </div>
                          ) : !isAdmin && payment.status === 'pending' && payment.paid_amount && parseFloat(payment.paid_amount) > 0 ? (
                            /* ATLETA: Pagamento Parcial com Progresso */
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center">
                                  <span className="text-green-600 font-bold">
                                    {formatCurrency(parseFloat(payment.paid_amount))}
                                  </span>
                                  <span className="text-gray-400 mx-1">/</span>
                                  <span className="text-gray-900 font-bold">
                                    {formatCurrency(parseFloat(payment.amount))}
                                  </span>
                                </div>
                                {/* NOME DO GRUPO/CAMPEONATO - Ao lado do valor */}
                                {payment.groupName && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    🏐 {payment.groupName}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${(parseFloat(payment.paid_amount) / parseFloat(payment.amount)) * 100}%`
                                    }}
                                  ></div>
                                </div>
                                <div className="flex justify-between text-xs mt-1">
                                  <span className="text-green-600">✓ Pago</span>
                                  <span className="text-red-600">Falta: {formatCurrency(parseFloat(payment.amount) - parseFloat(payment.paid_amount))}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* ATLETA: Pagamento Normal (Pendente ou Pago) */
                            <div className="flex items-center gap-2">
                              <span className={payment.status === 'expense' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                                {formatCurrency(payment.displayAmount)}
                              </span>
                              {/* NOME DO GRUPO/CAMPEONATO - Ao lado do valor */}
                              {!isAdmin && payment.groupName && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  🏐 {payment.groupName}
                                </span>
                              )}
                            </div>
                          )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.isGroupPayment ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {payment.groupName || 'Grupo'}
                            </span>
                          ) : (
                            payment.category
                          )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.due_date)}
                    </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          <div>
                            <div className="truncate">{payment.observation || '-'}</div>
                            {!isAdmin && payment.pix_key && (
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                <div className="font-semibold text-blue-900 mb-1">💳 Dados para Pagamento PIX:</div>
                                {payment.pix_name && (
                                  <div className="text-gray-700">
                                    <strong>Nome:</strong> {payment.pix_name}
                                  </div>
                                )}
                                <div className="text-gray-700 font-mono">
                                  <strong>Chave:</strong> {payment.pix_key}
                                </div>
                              </div>
                            )}
                          </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                            {/* Botão de anexar comprovante - APENAS para atletas (não admins) e pagamentos pendentes */}
                            {payment.status === 'pending' && !isAdmin && currentUser?.role !== 'admin' && (
                              <button
                                onClick={() => handleUploadProof(payment)}
                                className="text-blue-600 hover:text-blue-900"
                                title={payment.paid_amount && parseFloat(payment.paid_amount) > 0 ? 'Anexar comprovante do restante' : 'Anexar comprovante'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                              </button>
                            )}
                            {isAdmin && (
                              <>
                                {payment.isGroupPayment && payment.groupPayments && payment.groupPayments.length > 0 && (
                                  <button
                                    onClick={() => handleSyncGroupPayments(payment)}
                                    className="text-purple-600 hover:text-purple-900 transition-colors"
                                    title={`🔄 Sincronizar grupo: adicionar novos atletas e remover atletas que saíram (${payment.groupMemberCount} no grupo)`}
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  </button>
                                )}
                          <button
                            onClick={() => handleMarkPaid(payment.id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Marcar como Pago"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        <button
                          onClick={() => handleEditPayment(payment)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Excluir"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                              </>
                            )}
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
                  {isAdmin
                    ? 'Tente ajustar os filtros ou adicione um novo pagamento.'
                    : 'Você não possui pagamentos pendentes no momento.'
                  }
                </p>
          </div>
        )}
      </div>

          {/* Resumo para Atletas */}
          {!isAdmin && filteredPayments.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pagos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {filteredPayments.filter(p => p.status === 'paid').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {filteredPayments.filter(p => p.status === 'pending').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Pendente</p>
                    <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                        filteredPayments.reduce((sum, p) => {
                          if (p.status === 'pending') {
                            // Se tem paid_amount, somar apenas o que FALTA pagar
                            if (p.paid_amount && parseFloat(p.paid_amount) > 0) {
                              const remaining = parseFloat(p.amount || 0) - parseFloat(p.paid_amount || 0);
                              return sum + remaining;
                            }
                            // Senão, somar valor completo (totalmente pendente)
                            return sum + parseFloat(p.amount || 0);
                          }
                          return sum;
                        }, 0)
                  )}
                </p>
              </div>
            </div>
          </div>
            </div>
          )}

          {/* Resumo para Admin */}
          {isAdmin && filteredPayments.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de Cobranças</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {filteredPayments.length}
                </p>
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
                    <p className="text-sm font-medium text-gray-600">Pagos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {filteredPayments.filter(p => p.status === 'paid').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-600">
                  {filteredPayments.filter(p => p.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

              <div className="card p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total de Grupos</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {sortedAndFilteredPayments.filter(p => p.isGroupPayment).length}
                    </p>
                  </div>
                </div>
              </div>
        </div>
          )}
        </>
      )}

      {/* Conteúdo da Aba: Resumo por Atleta */}
      {activeTab === 'summary' && isAdmin && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Resumo por Atleta</h3>
            
            {/* Filtros: Barra de Pesquisa + Grupo + Ano */}
            <div className="flex gap-3">
              {/* Barra de Pesquisa */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar por nome ou telefone..."
                  value={summarySearchTerm}
                  onChange={(e) => setSummarySearchTerm(e.target.value)}
                  className="px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-64"
                />
                <svg 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {summarySearchTerm && (
                  <button
                    onClick={() => setSummarySearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filtro de Grupo */}
              <select
                value={summaryGroup}
                onChange={(e) => setSummaryGroup(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-[200px]"
              >
                <option value="all">👥 Todos os grupos</option>
                {groups
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
              </select>

              {/* Filtro de Ano */}
              <select
                value={summaryYear}
                onChange={(e) => setSummaryYear(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">📅 Todos os anos</option>
                {(() => {
                  // Gerar lista de anos disponíveis nos pagamentos
                  const years = new Set();
                  payments.forEach(p => {
                    if (p.due_date) {
                      const year = p.due_date.substring(0, 4);
                      years.add(year);
                    }
                  });
                  return Array.from(years).sort((a, b) => b.localeCompare(a)).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ));
                })()}
              </select>
            </div>
          </div>

          {/* Indicador de Filtros Ativos */}
          {(summarySearchTerm || summaryYear !== 'all' || summaryGroup !== 'all') && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-wrap gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="text-blue-800 font-medium">Filtros ativos:</span>
                  {summarySearchTerm && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                      Busca: "{summarySearchTerm}"
                    </span>
                  )}
                  {summaryGroup !== 'all' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                      Grupo: {groups.find(g => g.id === summaryGroup)?.name || summaryGroup}
                    </span>
                  )}
                  {summaryYear !== 'all' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                      Ano: {summaryYear}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSummarySearchTerm('');
                    setSummaryYear('all');
                    setSummaryGroup('all');
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          )}

          {(() => {
            // Filtrar membros que têm pagamentos
            const membersWithPayments = members
              .filter(member => {
                // Filtrar por nome OU telefone
                if (summarySearchTerm.trim() !== '') {
                  const searchLower = summarySearchTerm.toLowerCase().trim();
                  const memberName = (member.full_name || member.name || '').toLowerCase();
                  const memberPhone = (member.phone || '').toLowerCase();
                  
                  // Busca por nome ou telefone
                  if (!memberName.includes(searchLower) && !memberPhone.includes(searchLower)) {
                    return false;
                  }
                }
                return true;
              })
              .map(member => {
                // Filtrar pagamentos do membro - usar payments completo para incluir pagamentos de grupo individuais
                // Comparar IDs como string para evitar problemas de tipo
                let memberPayments = payments.filter(p => {
                  const paymentMemberId = p.member_id?.toString();
                  const memberId = member.id?.toString();
                  return paymentMemberId === memberId;
                });
                
                // Filtrar por grupo se não for "all"
                if (summaryGroup !== 'all') {
                  memberPayments = memberPayments.filter(p => {
                    const paymentGroupId = p.group_id?.toString();
                    const filterGroupId = summaryGroup?.toString();
                    return paymentGroupId === filterGroupId;
                  });
                }
                
                // Filtrar por ano se não for "all"
                if (summaryYear !== 'all') {
                  memberPayments = memberPayments.filter(p => 
                    p.due_date && p.due_date.startsWith(summaryYear)
                  );
                }
                
                // Retornar objeto com membro e pagamentos
                return { member, memberPayments };
              })
              .filter(({ memberPayments }) => memberPayments.length > 0)
              .map(({ member, memberPayments }) => {

              // Calcular valores corretos (usando amount, não displayAmount)
              const totalExpected = memberPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
              
              // Somar pagamentos completos E parciais
              const totalPaid = memberPayments.reduce((sum, p) => {
                if (p.status === 'paid') {
                  // Se está pago, somar o valor completo
                  return sum + parseFloat(p.amount || 0);
                } else if (p.paid_amount && parseFloat(p.paid_amount) > 0) {
                  // Se tem paid_amount (parcial), somar apenas o valor já pago
                  return sum + parseFloat(p.paid_amount || 0);
                }
                return sum;
              }, 0);
              
              const totalPending = totalExpected - totalPaid;

              return (
                <div key={member.id} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-shrink-0">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.full_name || member.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <div 
                          className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center"
                          style={{ display: member.avatar_url ? 'none' : 'flex' }}
                        >
                          <span className="text-primary-600 font-medium">
                            {(member.full_name || member.name || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{member.full_name || member.name}</h4>
                        <p className="text-sm text-gray-500">{member.phone || '-'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total</div>
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(totalExpected)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 font-medium">Pago</span>
                      <span className="text-green-600 font-bold">{formatCurrency(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600 font-medium">Pendente</span>
                      <span className="text-red-600 font-bold">{formatCurrency(totalPending)}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{memberPayments.filter(p => p.status === 'paid').length} pago(s)</span>
                      <span>{Math.round(totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0)}%</span>
                    </div>
                  </div>

                  {/* Detalhamento por grupo/categoria */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500 space-y-1">
                      {(() => {
                        // Agrupar por grupo ou categoria
                        const grouped = {};
                        memberPayments.forEach(p => {
                          const key = p.isGroupPayment && p.groupName 
                            ? `Grupo: ${p.groupName}` 
                            : p.category || 'Sem categoria';
                          
                          if (!grouped[key]) {
                            grouped[key] = [];
                          }
                          grouped[key].push(p);
                        });

                        return Object.entries(grouped).map(([key, categoryPayments]) => {
                          const categoryTotal = categoryPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                          
                          // Somar pagamentos completos E parciais por grupo/categoria
                          const categoryPaid = categoryPayments.reduce((sum, p) => {
                            if (p.status === 'paid') {
                              return sum + parseFloat(p.amount || 0);
                            } else if (p.paid_amount && parseFloat(p.paid_amount) > 0) {
                              return sum + parseFloat(p.paid_amount || 0);
                            }
                            return sum;
                          }, 0);

                          return (
                            <div key={key} className="flex justify-between">
                              <span>{key}</span>
                              <span className={categoryPaid === categoryTotal ? 'text-green-600' : 'text-gray-600'}>
                                {formatCurrency(categoryPaid)} / {formatCurrency(categoryTotal)}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              );
              });

            // Verificar se há membros com pagamentos
            if (membersWithPayments.length === 0) {
              return (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum atleta com pagamentos encontrado</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {summarySearchTerm || summaryGroup !== 'all' || summaryYear !== 'all'
                      ? 'Tente ajustar os filtros ou verifique se os pagamentos foram criados corretamente.'
                      : 'Crie pagamentos para os atletas para ver o resumo aqui.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {membersWithPayments}
              </div>
            );
          })()}
        </div>
      )}

      {showForm && isAdmin && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <PaymentForm
              payment={editingPayment}
              members={members}
              categories={categories}
              groups={groups}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              supabase={supabase}
              currentUser={currentUser}
            />
          </div>
        </div>
      )}

      {/* Modal de Upload de Comprovante */}
      {showProofModal && selectedPaymentForProof && supabase && currentUser && (
        <PaymentProofModal
          payment={selectedPaymentForProof}
          onClose={handleProofModalClose}
          supabase={supabase}
          currentUser={currentUser}
        />
      )}

      {/* Modal de Revisão de Comprovantes */}
      {showProofReview && isAdmin && supabase && currentUser && (
        <PaymentProofReview
          supabase={supabase}
          currentUser={currentUser}
          onClose={handleProofReviewClose}
        />
      )}

      {/* Modal de Seleção de Pagamento para Atletas */}
      {showSelectPaymentModal && (
        <SelectPaymentModal
          payments={filteredPayments}
          onSelect={(payment) => {
            setShowSelectPaymentModal(false);
            handleUploadProof(payment);
          }}
          onPayAll={(payments) => {
            setShowSelectPaymentModal(false);
            // Criar um objeto "virtual" com múltiplos pagamentos
            setSelectedPaymentForProof({
              isMultiple: true,
              payments: payments,
              totalAmount: payments.reduce((sum, p) => {
                const amount = parseFloat(p.amount || 0);
                const paidAmount = parseFloat(p.paid_amount || 0);
                return sum + (amount - paidAmount);
              }, 0)
            });
            setShowProofModal(true);
          }}
          onClose={() => setShowSelectPaymentModal(false)}
        />
      )}
    </div>
  );
};

export default Payments;

