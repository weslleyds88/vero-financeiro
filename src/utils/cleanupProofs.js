/**
 * Utilitário para limpeza automática de comprovantes antigos
 * Remove comprovantes aprovados ou rejeitados após um período especificado
 */

export const scheduleCleanupProofs = async (supabase, hoursToKeep = 24) => {
  if (!supabase) {
    console.warn('⚠️ Supabase não disponível, pulando limpeza de comprovantes');
    return;
  }

  try {
    console.log(`🧹 Agendando limpeza de comprovantes (manter últimos ${hoursToKeep} horas)...`);
    
    // Calcular data limite
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursToKeep);

    // Buscar comprovantes antigos aprovados ou rejeitados
    const { data: oldProofs, error: fetchError } = await supabase
      .from('payment_proofs')
      .select('id, status, reviewed_at')
      .in('status', ['approved', 'rejected'])
      .lt('reviewed_at', cutoffDate.toISOString());

    if (fetchError) {
      console.error('❌ Erro ao buscar comprovantes antigos:', fetchError);
      return;
    }

    if (!oldProofs || oldProofs.length === 0) {
      console.log('✅ Nenhum comprovante antigo para limpar');
      return;
    }

    console.log(`🗑️ Encontrados ${oldProofs.length} comprovantes antigos para remover`);

    // Deletar comprovantes antigos
    const { error: deleteError } = await supabase
      .from('payment_proofs')
      .delete()
      .in('id', oldProofs.map(p => p.id));

    if (deleteError) {
      console.error('❌ Erro ao deletar comprovantes antigos:', deleteError);
      return;
    }

    console.log(`✅ ${oldProofs.length} comprovante(s) antigo(s) removido(s) com sucesso`);

  } catch (error) {
    console.error('❌ Erro na limpeza de comprovantes:', error);
  }
};

/**
 * Executar limpeza manual de comprovantes
 */
export const cleanupOldProofs = async (supabase, daysToKeep = 30) => {
  if (!supabase) {
    throw new Error('Supabase não disponível');
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data: oldProofs, error: fetchError } = await supabase
      .from('payment_proofs')
      .select('id')
      .in('status', ['approved', 'rejected'])
      .lt('reviewed_at', cutoffDate.toISOString());

    if (fetchError) throw fetchError;

    if (!oldProofs || oldProofs.length === 0) {
      return { deleted: 0, message: 'Nenhum comprovante antigo encontrado' };
    }

    const { error: deleteError } = await supabase
      .from('payment_proofs')
      .delete()
      .in('id', oldProofs.map(p => p.id));

    if (deleteError) throw deleteError;

    return { 
      deleted: oldProofs.length, 
      message: `${oldProofs.length} comprovante(s) removido(s) com sucesso` 
    };

  } catch (error) {
    console.error('Erro na limpeza manual:', error);
    throw error;
  }
};

