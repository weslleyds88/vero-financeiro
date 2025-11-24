import React, { useState } from 'react';

const PaymentProofModal = ({ payment, onClose, supabase, currentUser }) => {
  // Detectar se é pagamento múltiplo
  const isMultiple = payment?.isMultiple || false;
  
  // Calcular o valor restante a pagar
  let totalAmount, alreadyPaid, remainingAmount;
  
  if (isMultiple) {
    // Para múltiplos pagamentos, usar o total já calculado
    totalAmount = payment.totalAmount;
    alreadyPaid = 0;
    remainingAmount = totalAmount;
  } else {
    // Para pagamento único
    totalAmount = parseFloat(payment?.amount || 0);
    alreadyPaid = parseFloat(payment?.paid_amount || 0);
    remainingAmount = totalAmount - alreadyPaid;
  }
  
  const [proofFile, setProofFile] = useState(null);
  const [proofAmount, setProofAmount] = useState(remainingAmount > 0 ? remainingAmount.toString() : totalAmount.toString() || '');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [observation, setObservation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Tipo de arquivo não permitido. Use JPG, PNG ou PDF.');
        return;
      }
      
      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Arquivo muito grande. Máximo 5MB.');
        return;
      }
      
      setProofFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!proofFile) {
      setError('Selecione um comprovante');
      return;
    }
    
    if (!proofAmount || parseFloat(proofAmount) <= 0) {
      setError('Valor do comprovante deve ser maior que zero');
      return;
    }

    // Validar que o valor não seja maior que o valor RESTANTE do pagamento
    const enteredAmount = parseFloat(proofAmount);
    
    if (enteredAmount > remainingAmount) {
      setError(`O valor não pode ser maior que o valor restante (R$ ${remainingAmount.toFixed(2)})`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Converter arquivo para base64
      const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
      };

      console.log('📁 Convertendo arquivo para base64...');
      console.log('📄 Tipo do arquivo:', proofFile.type);
      console.log('📏 Tamanho do arquivo:', proofFile.size);

      const base64Data = await convertToBase64(proofFile);
      console.log('✅ Arquivo convertido para base64');

      // 2. Salvar comprovante no banco com imagem em base64
      if (isMultiple) {
        // Para pagamento múltiplo, criar um comprovante para cada pagamento
        console.log('💰 Pagamento MÚLTIPLO detectado!');
        console.log('📋 Pagamentos incluídos:', payment.payments.length);
        console.log('💵 Valor DIGITADO pelo usuário:', proofAmount);
        console.log('💵 Valor TOTAL das cobranças:', remainingAmount);
        
        // Calcular valor total pendente de todas as cobranças
        const totalPendingAmount = payment.payments.reduce((sum, p) => {
          return sum + (parseFloat(p.amount) - parseFloat(p.paid_amount || 0));
        }, 0);
        
        // Valor que o usuário REALMENTE está pagando
        const actualPaymentAmount = parseFloat(proofAmount);
        
        console.log('🔢 Total pendente:', totalPendingAmount.toFixed(2));
        console.log('🔢 Valor sendo pago:', actualPaymentAmount.toFixed(2));
        
        // Criar um comprovante para CADA pagamento, distribuindo proporcionalmente o valor pago
        let distributedAmounts = [];
        let totalDistributed = 0;
        
        // Primeiro, calcular valores proporcionais para todos exceto o último
        payment.payments.forEach((p, index) => {
          const amountDue = parseFloat(p.amount) - parseFloat(p.paid_amount || 0);
          let proportionalAmount;
          
          if (index === payment.payments.length - 1) {
            // Último pagamento: calcular o resto para evitar erros de arredondamento
            proportionalAmount = actualPaymentAmount - totalDistributed;
          } else {
            // Calcular proporcional: (amountDue / totalPendingAmount) * actualPaymentAmount
            proportionalAmount = (amountDue / totalPendingAmount) * actualPaymentAmount;
            proportionalAmount = Math.round(proportionalAmount * 100) / 100; // Arredondar
            totalDistributed += proportionalAmount;
          }
          
          // Garantir que não seja negativo
          proportionalAmount = Math.max(0, proportionalAmount);
          
          console.log(`📝 ${p.category}:`, {
            amountDue: amountDue.toFixed(2),
            proportionalAmount: proportionalAmount.toFixed(2),
            percentage: ((amountDue / totalPendingAmount) * 100).toFixed(1) + '%'
          });
          
          distributedAmounts.push(proportionalAmount);
        });
        
        // Agora criar os comprovantes com os valores já calculados
        const proofsToInsert = payment.payments.map((p, index) => {
          return {
            payment_id: p.id,
            user_id: currentUser.id,
            proof_file_url: 'database://stored',
            proof_image_base64: base64Data, // Mesma imagem para todos
            proof_image_type: proofFile.type,
            proof_image_size: proofFile.size,
            storage_method: 'database',
            proof_amount: distributedAmounts[index], // ✅ Valor PROPORCIONAL ao que foi pago!
            payment_method: paymentMethod,
            observation: observation.trim() || null,
            status: 'pending',
            // Adicionar metadados para identificar pagamento múltiplo
            multiple_payment_ids: payment.payments.map(p => p.id).join(',')
          };
        });
        
        const { error: proofError } = await supabase
          .from('payment_proofs')
          .insert(proofsToInsert);
        
        if (proofError) throw proofError;
        
        const totalInserted = proofsToInsert.reduce((sum, p) => sum + p.proof_amount, 0);
        console.log(`✅ ${proofsToInsert.length} comprovantes criados para pagamento múltiplo`);
        console.log(`💰 Valor total distribuído: R$ ${totalInserted.toFixed(2)}`);
      } else {
        // Pagamento único (comportamento normal)
        const { error: proofError } = await supabase
          .from('payment_proofs')
          .insert({
            payment_id: payment.id,
            user_id: currentUser.id,
            proof_file_url: 'database://stored',
            proof_image_base64: base64Data,
            proof_image_type: proofFile.type,
            proof_image_size: proofFile.size,
            storage_method: 'database',
            proof_amount: parseFloat(proofAmount),
            payment_method: paymentMethod,
            observation: observation.trim() || null,
            status: 'pending'
          });

        if (proofError) throw proofError;
      }

      // 4. Criar notificação para o próprio usuário confirmando o envio
      const userNotificationMessage = isMultiple
        ? `Comprovante de R$ ${parseFloat(proofAmount).toFixed(2)} enviado para ${payment.payments.length} cobranças. Aguarde aprovação do administrador.`
        : `Comprovante de R$ ${parseFloat(proofAmount).toFixed(2)} enviado com sucesso. Aguarde aprovação do administrador.`;
      
      await supabase
        .from('notifications')
        .insert({
          user_id: currentUser.id,
          title: isMultiple ? 'Pagamento Múltiplo Enviado' : 'Comprovante Enviado',
          message: userNotificationMessage,
          type: 'success'
        });

      // 5. Criar notificação para todos os admins sobre o novo comprovante
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (admins && admins.length > 0) {
        const adminNotificationMessage = isMultiple
          ? `Novo comprovante MÚLTIPLO de R$ ${parseFloat(proofAmount).toFixed(2)} para ${payment.payments.length} cobranças aguardando aprovação.`
          : `Novo comprovante de R$ ${parseFloat(proofAmount).toFixed(2)} aguardando aprovação.`;
        
        const adminNotifications = admins.map(admin => ({
          user_id: admin.id,
          title: isMultiple ? 'Pagamento Múltiplo Recebido' : 'Novo Comprovante Recebido',
          message: adminNotificationMessage,
          type: 'info'
        }));

        await supabase
          .from('notifications')
          .insert(adminNotifications);
      }

      alert('Comprovante enviado com sucesso! Aguarde a aprovação do administrador.');
      onClose();

    } catch (error) {
      console.error('Erro ao enviar comprovante:', error);
      setError('Erro ao enviar comprovante: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {isMultiple ? '💰 Pagar Múltiplas Cobranças' : 'Enviar Comprovante de Pagamento'}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Informações do Pagamento */}
          <div className={`p-3 rounded-lg ${isMultiple ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' : 'bg-gray-50'}`}>
            {isMultiple ? (
              <>
                <h4 className="font-bold text-green-900 mb-3">Pagamento Múltiplo ({payment.payments.length} cobranças):</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {payment.payments.map((p, index) => (
                    <div key={p.id} className="bg-white p-2 rounded border border-green-200">
                      <p className="text-sm font-semibold text-gray-900">{index + 1}. {p.category}</p>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Valor: R$ {parseFloat(p.amount).toFixed(2)}</span>
                        {parseFloat(p.paid_amount || 0) > 0 && (
                          <span className="text-green-600">Pago: R$ {parseFloat(p.paid_amount).toFixed(2)}</span>
                        )}
                        <span className="text-red-600 font-semibold">
                          Falta: R$ {(parseFloat(p.amount) - parseFloat(p.paid_amount || 0)).toFixed(2)}
                        </span>
                      </div>
                      {p.observation && <p className="text-xs text-gray-500 mt-1">{p.observation}</p>}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t-2 border-green-300">
                  <p className="text-sm font-bold text-green-900">
                    💵 Valor Total Pendente: R$ {remainingAmount.toFixed(2)}
                  </p>
                </div>
              </>
            ) : (
              <>
                <h4 className="font-medium text-gray-900 mb-2">Pagamento:</h4>
                <p className="text-sm text-gray-600">
                  <strong>{payment.category}</strong> - R$ {totalAmount.toFixed(2)}
                </p>
                {payment.group_name && (
                  <p className="text-sm text-gray-600">Grupo: {payment.group_name}</p>
                )}
                {alreadyPaid > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <p className="text-xs text-green-600">
                      ✓ Já pago: R$ {alreadyPaid.toFixed(2)}
                    </p>
                    <p className="text-xs text-red-600 font-semibold">
                      Falta pagar: R$ {remainingAmount.toFixed(2)}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Upload do Arquivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comprovante *
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos aceitos: JPG, PNG, PDF (máximo 5MB)
            </p>
          </div>

          {/* Valor do Comprovante */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor Pago *
            </label>
            <input
              type="number"
              value={proofAmount}
              onChange={(e) => setProofAmount(e.target.value)}
              step="0.01"
              min="0.01"
              max={remainingAmount}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0,00"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {alreadyPaid > 0 ? (
                <>
                  Máximo: R$ {remainingAmount.toFixed(2)} <span className="text-red-600 font-semibold">(restante a pagar)</span>
                </>
              ) : (
                <>
                  Máximo: R$ {remainingAmount.toFixed(2)} (você pode pagar parcialmente)
                </>
              )}
            </p>
          </div>

          {/* Método de Pagamento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pagamento
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pix">PIX</option>
              <option value="transfer">Transferência</option>
              <option value="cash">Dinheiro</option>
              <option value="card">Cartão</option>
            </select>
          </div>

          {/* Observação (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observação (opcional)
            </label>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Adicione uma observação sobre este pagamento (opcional)"
            />
            <p className="text-xs text-gray-500 mt-1">
              {observation.length}/500 caracteres
            </p>
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Comprovante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentProofModal;

