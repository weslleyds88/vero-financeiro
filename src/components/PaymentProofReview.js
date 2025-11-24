import React, { useState, useEffect, useCallback } from 'react';

const PaymentProofReview = ({ supabase, currentUser, onClose }) => {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 30;
  const [selectedProof, setSelectedProof] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Opções de rejeição
  const rejectionOptions = [
    { value: 'valor_divergente', label: 'Valor divergente' },
    { value: 'data_errada', label: 'Data errada' },
    { value: 'outros', label: 'Outros (iremos entrar em contato)' }
  ];

  // Função para criar ticket INDIVIDUAL por pagamento (não por cobrança completa)
  const createIndividualPaymentTicket = async (proofData, paymentData, adminUserId, isFullyPaid) => {
    try {
      console.log('🎫 ========================================');
      console.log('🎫 CRIANDO TICKET INDIVIDUAL PARA PAGAMENTO:', paymentData.id);
      console.log('🎫 proofData COMPLETO:', proofData);
      console.log('🎫 paymentData COMPLETO:', paymentData);
      console.log('🎫 Valor deste pagamento (proof_amount):', proofData.proof_amount);
      console.log('🎫 Valor total da cobrança (amount):', paymentData.amount);
      console.log('🎫 Status:', isFullyPaid ? 'COMPLETO' : 'PARCIAL');
      console.log('🎫 ========================================');

      // Buscar nome do grupo (se tiver)
      let groupName = null;
      if (paymentData.group_id) {
        const { data: groupData } = await supabase
          .from('user_groups')
          .select('name')
          .eq('id', paymentData.group_id)
          .single();
        
        groupName = groupData?.name || null;
        console.log('📋 Nome do grupo:', groupName);
      }

      // Criar ticket diretamente (sempre novo, nunca atualiza)
      const ticketData = {
        payment_id: paymentData.id,
        user_id: paymentData.member_id,
        user_name: paymentData.profiles?.full_name || 'Usuário Desconhecido',
        user_email: paymentData.profiles?.email || null,
        amount: parseFloat(proofData.proof_amount), // VALOR DESTE PAGAMENTO, não o total
        category: paymentData.category,
        group_name: groupName, // Nome do grupo
        payment_status: isFullyPaid ? 'Completo' : 'Parcial', // Status do pagamento
        payment_method: proofData.payment_method,
        observation: proofData.observation || null, // Observação do atleta
        proof_image_base64: proofData.proof_image_base64, // 1 comprovante por ticket
        approved_by: adminUserId,
        approved_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() // 60 dias
      };

      console.log('📝 Dados do ticket:', {
        payment_id: ticketData.payment_id,
        category: ticketData.category,
        group_name: ticketData.group_name,
        amount: ticketData.amount,
        payment_status: ticketData.payment_status
      });

      // Criar novo ticket (sempre)
      const { data, error } = await supabase
        .from('payment_tickets')
        .insert(ticketData)
        .select('id')
        .single();

      if (error) throw error;

      console.log('✅✅✅ TICKET CRIADO COM SUCESSO! ID:', data.id);
      console.log('🎫 ========================================');
      return data;
    } catch (error) {
      console.error('❌ Erro ao criar ticket:', error);
      throw error;
    }
  };

  // Função auxiliar para verificar se uma URL está malformada
  const isMalformedProofUrl = (url) => {
    if (!url) return false;

    return (
      url.includes('------WebKitFormBoundary') ||
      url.includes('Content-Disposition') ||
      url.includes('form-data') ||
      url.includes('multipart/form-data') ||
      (url.includes('PNG') && url.includes('IHDR')) ||
      url.includes('�PNG') ||
      url.length > 1000 ||
      !url.startsWith('https://')
    );
  };


  const loadPendingProofs = useCallback(async () => {
    try {
      console.log('🔍 Carregando comprovantes pendentes SEM IMAGENS (otimizado)...');

      // Carregar apenas metadados, SEM as imagens pesadas
      const { data, error } = await supabase
        .from('payment_proofs')
        .select('id, payment_id, user_id, proof_amount, payment_method, observation, status, submitted_at, storage_method, profiles:user_id(id, full_name, email)')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (error) {
        console.log('❌ Erro na query:', error);
        throw error;
      }

      console.log('📋 Comprovantes (metadados) carregados:', data?.length || 0);

      // Enriquecer com informações de grupo (campeonato)
      const proofsList = data || [];

      // Buscar pagamentos relacionados em lote
      const paymentIds = proofsList.map(p => p.payment_id).filter(Boolean);
      let paymentMap = new Map();
      let groupNameMap = new Map();

      if (paymentIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('payments')
          .select('id, group_id, category')
          .in('id', paymentIds);

        if (!paymentsError && Array.isArray(paymentsData)) {
          paymentsData.forEach(p => paymentMap.set(p.id, p));

          const groupIds = [...new Set(paymentsData.map(p => p.group_id).filter(Boolean))];
          if (groupIds.length > 0) {
            const { data: groupsData, error: groupsError } = await supabase
              .from('user_groups')
              .select('id, name')
              .in('id', groupIds);

            if (!groupsError && Array.isArray(groupsData)) {
              groupsData.forEach(g => groupNameMap.set(g.id, g.name));
            }
          }
        }
      }

      // Adicionar flag de imagem + nome do grupo
      const processedProofs = proofsList.map(proof => {
        const paymentInfo = paymentMap.get(proof.payment_id);
        const groupName = paymentInfo?.group_id ? groupNameMap.get(paymentInfo.group_id) : null;
        return {
          ...proof,
          imageUrl: null,         // Será carregada sob demanda
          hasValidImage: true,    // Assumir que tem (carregar depois)
          imageLoaded: false,
          groupName: groupName || null,
          paymentCategory: paymentInfo?.category || null
        };
      });

      // Se página 0, substitui; senão, concatena
      setProofs(prev => (page === 0 ? processedProofs : [...prev, ...processedProofs]));
      console.log('✅ Comprovantes processados (com grupos):', processedProofs.length);
    } catch (error) {
      console.error('❌ Erro ao carregar comprovantes:', error);
      setProofs([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, page]);

  // Função auxiliar para obter o rótulo da razão de rejeição
  const getRejectionLabel = (value) => {
    const option = rejectionOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  useEffect(() => {
    loadPendingProofs();
  }, [loadPendingProofs]);

  const handleApprove = async (proofId) => {
    setIsSubmitting(true);
    try {
      // 1. Aprovar o comprovante
      const { error: approveError } = await supabase
        .from('payment_proofs')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          admin_message: null
        })
        .eq('id', proofId);

      if (approveError) throw approveError;

      // 2. Atualizar o pagamento (pago total ou parcial)
      const currentProof = proofs.find(p => p.id === proofId);
      if (currentProof) {
        console.log('🔄 Atualizando pagamento:', currentProof.payment_id);
        
        // Buscar dados completos do pagamento (incluindo id, group_id, category, profiles)
        const { data: paymentData, error: fetchError } = await supabase
          .from('payments')
          .select('*, profiles:member_id(id, full_name, email)')
          .eq('id', currentProof.payment_id)
          .single();

        if (fetchError) {
          console.error('❌ Erro ao buscar pagamento:', fetchError);
          throw fetchError;
        }

        // Calcular novo valor pago
        const totalAmount = parseFloat(paymentData.amount);
        const currentPaidAmount = parseFloat(paymentData.paid_amount || 0);
        const proofAmount = parseFloat(currentProof.proof_amount);
        const newPaidAmount = currentPaidAmount + proofAmount;

        // Verificar se pagamento está completo
        const isFullyPaid = newPaidAmount >= totalAmount;

        console.log('💰 Cálculo de pagamento:', {
          totalAmount,
          currentPaidAmount,
          proofAmount,
          newPaidAmount,
          isFullyPaid
        });
        
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            paid_amount: newPaidAmount,
            status: isFullyPaid ? 'paid' : 'pending',
            paid_at: isFullyPaid ? new Date().toISOString() : null
          })
          .eq('id', currentProof.payment_id);

        if (paymentError) {
          console.error('❌ Erro ao atualizar pagamento:', paymentError);
          throw paymentError;
        }
        
        console.log(`✅ Pagamento atualizado: ${isFullyPaid ? 'PAGO INTEGRALMENTE' : 'PENDENTE (pagamento parcial)'} - R$ ${newPaidAmount.toFixed(2)} de R$ ${totalAmount.toFixed(2)}`);
        
        // 3. Criar ticket SEMPRE (tanto parcial quanto completo)
        {
          const proof = proofs.find(p => p.id === proofId);
          if (proof) {
            let ticketId = null;
            try {
          // Verificar se o usuário existe no sistema antes de criar ticket
          console.log('🎫 Verificando usuário antes de criar ticket:', proof.user_id);

          const { data: userCheck, error: userError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', proof.user_id)
            .single();

          if (userError || !userCheck) {
            console.warn('⚠️ Usuário não encontrado no profiles:', proof.user_id);
            // Continuar sem criar ticket se o usuário não existir
          } else {
            // Tentar criar ticket - se currentUser não estiver disponível, buscar um admin do banco
            let adminUserId = null;

            if (currentUser && currentUser.id) {
              adminUserId = currentUser.id;
            } else {
              // Buscar um admin do banco como fallback
              console.log('🔄 currentUser não disponível, buscando admin do banco...');
              try {
                const { data: adminUser, error: adminError } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('role', 'admin')
                  .limit(1)
                  .single();

                if (!adminError && adminUser) {
                  adminUserId = adminUser.id;
                  console.log('✅ Admin encontrado no banco:', adminUserId);
                } else {
                  console.warn('⚠️ Nenhum admin encontrado no banco, tentando buscar qualquer usuário...');
                  // Fallback: buscar qualquer usuário como último recurso
                  const { data: anyUser, error: anyError } = await supabase
                    .from('profiles')
                    .select('id')
                    .limit(1)
                    .single();

                  if (!anyError && anyUser) {
                    adminUserId = anyUser.id;
                    console.log('⚠️ Usando usuário fallback para criar ticket:', adminUserId);
                  } else {
                    console.error('❌ Erro ao buscar qualquer usuário:', anyError);
                  }
                }
              } catch (adminErr) {
                console.warn('⚠️ Erro ao buscar admin:', adminErr);
              }
            }

            if (adminUserId) {
              // BUSCAR IMAGEM E OBSERVAÇÃO DO COMPROVANTE antes de criar ticket (otimização lazy loading)
              console.log('📸 Buscando imagem e observação do comprovante para o ticket...');
              const { data: proofWithImage, error: imageError } = await supabase
                .from('payment_proofs')
                .select('proof_image_base64, observation')
                .eq('id', proofId)
                .single();

              if (imageError) {
                console.warn('⚠️ Erro ao buscar imagem do comprovante:', imageError);
              }

              // Mesclar dados do comprovante com a imagem e observação
              const completeProofData = {
                ...currentProof,
                proof_image_base64: proofWithImage?.proof_image_base64 || null,
                observation: proofWithImage?.observation || null
              };

              // Criar ticket individual para este pagamento específico
              console.log('🎫 Criando ticket individual para:', {
                payment_id: currentProof.payment_id,
                proof_amount: currentProof.proof_amount,
                user_id: currentProof.user_id,
                approved_by: adminUserId,
                isFullyPaid: isFullyPaid,
                hasImage: !!completeProofData.proof_image_base64
              });

              ticketId = await createIndividualPaymentTicket(completeProofData, paymentData, adminUserId, isFullyPaid);
              console.log('✅ Ticket criado com sucesso:', ticketId);
            } else {
              console.warn('⚠️ Nenhum admin disponível para criar ticket, pulando...');
            }
          }
            } catch (ticketError) {
              console.warn('⚠️ Erro ao criar ticket (não crítico):', ticketError.message || ticketError);
              // Não falhar a aprovação se o ticket não for criado
            }

            // Criar notificação apenas se o usuário NÃO for admin
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', proof.user_id)
              .single();

            if (userProfile?.role !== 'admin') {
              const notificationTitle = isFullyPaid 
                ? 'Pagamento Completo! 🎉' 
                : 'Pagamento Parcial Aprovado';
              
              const notificationMessage = isFullyPaid
                ? `Seu pagamento total de R$ ${totalAmount.toFixed(2)} foi aprovado! Ticket gerado com sucesso.`
                : `Seu pagamento parcial de R$ ${proofAmount.toFixed(2)} foi aprovado! Total pago: R$ ${newPaidAmount.toFixed(2)} de R$ ${totalAmount.toFixed(2)}. Ticket gerado com sucesso.`;

              await supabase
                .from('notifications')
                .insert({
                  user_id: proof.user_id,
                  title: notificationTitle,
                  message: notificationMessage,
                  type: 'success'
                });
              console.log(`✅ Notificação de pagamento ${isFullyPaid ? 'completo' : 'parcial'} criada para atleta`);
            } else {
              console.log('ℹ️ Notificação não enviada (usuário é admin)');
            }
          }
        }
      }

      alert('Comprovante aprovado com sucesso!');
      loadPendingProofs();

    } catch (error) {
      console.error('Erro ao aprovar comprovante:', error);
      alert('Erro ao aprovar comprovante: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (proofId) => {
    if (!rejectionReason) {
      alert('Selecione o motivo da recusa');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Rejeitar o comprovante
      const { error: rejectError } = await supabase
        .from('payment_proofs')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          admin_message: rejectionReason
        })
        .eq('id', proofId);

      if (rejectError) throw rejectError;

      // 2. Criar notificação apenas se o usuário NÃO for admin
      const proof = proofs.find(p => p.id === proofId);
      if (proof) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', proof.user_id)
          .single();

        if (userProfile?.role !== 'admin') {
          const rejectionLabel = getRejectionLabel(rejectionReason);
          await supabase
            .from('notifications')
            .insert({
              user_id: proof.user_id,
              title: 'Pagamento Rejeitado',
              message: `Seu pagamento foi rejeitado. Motivo: ${rejectionLabel}`,
              type: 'error'
            });
          console.log('✅ Notificação de rejeição criada para atleta');
        } else {
          console.log('ℹ️ Notificação de rejeição não enviada (usuário é admin)');
        }
      }

      alert('Comprovante rejeitado. O usuário foi notificado.');
      setRejectionReason('');
      setSelectedProof(null);
      loadPendingProofs();

    } catch (error) {
      console.error('Erro ao rejeitar comprovante:', error);
      alert('Erro ao rejeitar comprovante: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (proof) => {
    try {
      console.log('📁 Fazendo download do comprovante:', {
        id: proof.id,
        paymentId: proof.payment_id,
        hasBase64: !!proof.proof_image_base64,
        hasValidImage: proof.hasValidImage
      });

      // Se NÃO tem imagem carregada, buscar do banco AGORA (lazy loading)
      if (!proof.proof_image_base64) {
        console.log('🔍 Buscando imagem do banco de dados (lazy loading)...');
        const { data, error } = await supabase
          .from('payment_proofs')
          .select('proof_image_base64, proof_image_type, proof_image_size, proof_file_url, storage_method')
          .eq('id', proof.id)
          .single();

        if (error) {
          console.error('❌ Erro ao buscar imagem:', error);
          throw new Error('Erro ao carregar imagem do banco de dados');
        }

        // Atualizar o proof com a imagem carregada
        proof.proof_image_base64 = data.proof_image_base64;
        proof.proof_image_type = data.proof_image_type;
        proof.proof_image_size = data.proof_image_size;
        proof.proof_file_url = data.proof_file_url;
        proof.storage_method = data.storage_method;

        console.log('✅ Imagem carregada do banco de dados');
      }

      // Se tem imagem em base64, usar ela
      if (proof.proof_image_base64) {
        console.log('✅ Usando imagem do banco de dados');
        
        // Converter base64 para blob
        const base64Data = proof.proof_image_base64.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: proof.proof_image_type || 'image/jpeg' });
        
        // Criar link de download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Determinar extensão baseada no tipo
        let extension = 'jpg';
        if (proof.proof_image_type) {
          if (proof.proof_image_type.includes('png')) extension = 'png';
          else if (proof.proof_image_type.includes('jpeg')) extension = 'jpg';
          else if (proof.proof_image_type.includes('pdf')) extension = 'pdf';
        }
        
        link.download = `comprovante_${proof.payment_id}_${proof.id}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar URL
        window.URL.revokeObjectURL(url);
        console.log('✅ Download via base64 executado');
        return;
      }

      // Se não tem base64, tentar URL (fallback)
      if (proof.proof_file_url && !isMalformedProofUrl(proof.proof_file_url)) {
        console.log('🔄 Tentando URL como fallback');
        const newWindow = window.open(proof.proof_file_url, '_blank');
        if (newWindow) {
          console.log('✅ Download via URL executado');
          return;
        }
      }

      throw new Error('Nenhuma imagem válida encontrada para este comprovante');

    } catch (error) {
      console.error('❌ Erro no download:', error);
      alert('Erro ao fazer download do comprovante. Entre em contato com o suporte.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando comprovantes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-medium text-gray-900">
            Revisar Comprovantes de Pagamento ({proofs.length})
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

        {proofs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum comprovante pendente</h3>
            <p className="mt-1 text-sm text-gray-500">Todos os comprovantes foram revisados.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {proofs.map((proof) => (
                <div key={proof.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                          {proof.profiles?.full_name || 'Usuário Desconhecido'}
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">
                          {proof.profiles?.phone || proof.user_id}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Pagamento ID:</strong> {proof.payment_id}
                        </p>
                        {(proof.groupName || proof.paymentCategory) && (
                          <p className="text-sm text-gray-600 mt-1">
                            <strong>Grupo/Campeonato:</strong>{' '}
                            {proof.groupName ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-1">
                                🏐 {proof.groupName}
                              </span>
                            ) : (
                              <span className="ml-1 text-gray-700">{proof.paymentCategory}</span>
                            )}
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          <strong>Valor:</strong> R$ {proof.proof_amount?.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Método:</strong> {proof.payment_method}
                        </p>
                        {proof.observation && (
                          <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                            <p className="text-xs font-medium text-gray-700 mb-1">Observação do Atleta:</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{proof.observation}</p>
                          </div>
                        )}
                        <p className="text-sm text-gray-600">
                          <strong>Enviado em:</strong> {new Date(proof.submitted_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Preview do Comprovante */}
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Comprovante:</p>
                      <div className="border border-gray-200 rounded p-2 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Comprovante:</span>
                          <button
                            onClick={() => handleDownload(proof)}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                          >
                            ⬇️ Download
                          </button>
                        </div>
                        <div className="relative group">
                          {proof.hasValidImage && proof.imageUrl ? (
                            <img
                              src={proof.imageUrl}
                              alt="Comprovante"
                              className="max-w-xs max-h-48 object-contain border border-gray-200 rounded cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => handleDownload(proof)}
                              onError={(e) => {
                                console.error('Erro ao carregar imagem:', proof.imageUrl);
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="max-w-xs max-h-48 border border-gray-200 rounded flex items-center justify-center bg-gray-100">
                              <div className="text-center p-4">
                                <div className="text-gray-400 text-4xl mb-2">📄</div>
                                <p className="text-sm text-gray-600">Imagem não disponível</p>
                                <button
                                  onClick={() => handleDownload(proof)}
                                  className="mt-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                                >
                                  Tentar Download
                                </button>
                              </div>
                            </div>
                          )}
                          {proof.hasValidImage && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded">
                              <button
                                onClick={() => handleDownload(proof)}
                                className="bg-white text-gray-900 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
                              >
                                🔍 Ver Completo
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col space-y-2">
                    <button
                      onClick={() => handleApprove(proof.id)}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50"
                    >
                      ✓ Aprovar
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProof(proof.id);
                        setRejectionReason('');
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                    >
                      ✗ Rejeitar
                    </button>
                  </div>
                </div>

                {/* Modal de Rejeição */}
                {selectedProof === proof.id && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h5 className="font-medium text-red-900 mb-3">Motivo da Rejeição:</h5>
                    <div className="mb-4">
                      <select
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                      >
                        <option value="">Selecione o motivo da rejeição...</option>
                        {rejectionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProof(null);
                          setRejectionReason('');
                        }}
                        className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleReject(proof.id)}
                        disabled={isSubmitting || !rejectionReason}
                        className="px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
                      >
                        Confirmar Rejeição
                      </button>
                    </div>
                  </div>
                )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => {
                  setLoading(true);
                  setPage(prev => prev + 1);
                }}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded"
              >
                Carregar mais
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentProofReview;

