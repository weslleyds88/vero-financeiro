import React, { useState, useEffect, useCallback } from 'react';
import { exportTicketsToXLSX } from '../utils/exportXLSX';

const PaymentTickets = ({ supabase, currentUser, isAdmin = false }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showImage, setShowImage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      
      if (isAdmin) {
        // Admin vê todos os tickets
        const { data, error } = await supabase.rpc('get_all_tickets');
        if (error) throw error;
        setTickets(data || []);
      } else {
        // Usuário vê apenas seus tickets
        const { data, error } = await supabase.rpc('get_user_tickets', {
          p_user_id: currentUser.id
        });
        if (error) throw error;
        setTickets(data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentUser, isAdmin]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // Criar data a partir da string ISO (que está em UTC)
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn('Data inválida:', dateString);
        return dateString;
      }
      
      // Usar Intl.DateTimeFormat para converter corretamente de UTC para Brasília
      const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      return formatter.format(date);
    } catch (error) {
      console.error('Erro ao formatar data:', error, dateString);
      return dateString;
    }
  };

  const getDaysRemaining = (days) => {
    if (days < 0) return { text: 'Expirado', color: 'text-red-600' };
    if (days === 0) return { text: 'Expira hoje', color: 'text-orange-600' };
    if (days <= 3) return { text: `${days} dias restantes`, color: 'text-yellow-600' };
    return { text: `${days} dias restantes`, color: 'text-green-600' };
  };

  const handleViewProof = async (ticket) => {
    try {
      // Carregar imagem SOB DEMANDA (só quando clicar)
      console.log('🖼️ Carregando comprovante do ticket:', ticket.ticket_id);
      
      const { data, error } = await supabase
        .from('payment_tickets')
        .select('proof_image_base64')
        .eq('id', ticket.ticket_id)
        .single();
      
      if (error) throw error;
      
      setSelectedTicket({
        ...ticket,
        proof_image_base64: data.proof_image_base64
      });
      setShowImage(true);
    } catch (error) {
      console.error('Erro ao carregar comprovante:', error);
      alert('Erro ao carregar comprovante: ' + error.message);
    }
  };

  const handleCloseImage = () => {
    setShowImage(false);
    setSelectedTicket(null);
  };

  const handleExportTickets = () => {
    if (filteredTickets.length === 0) {
      alert('Não há tickets para exportar.');
      return;
    }
    
    try {
      exportTicketsToXLSX(filteredTickets);
      alert(`✅ ${filteredTickets.length} ticket(s) exportado(s) com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar tickets:', error);
      alert('Erro ao exportar tickets: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filtrar tickets por termo de busca (apenas para admin)
  const filteredTickets = isAdmin 
    ? tickets.filter(ticket => 
        ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.user_email && ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : tickets;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {isAdmin ? '📋 Todos os Tickets' : '🎫 Meus Tickets'}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={handleExportTickets}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center"
            title="Exportar todos os tickets para Excel"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Excel
          </button>
          <button
            onClick={loadTickets}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Filtro por Atleta - Apenas para Admin */}
      {isAdmin && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar atleta por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {filteredTickets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎫</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhum ticket encontrado
          </h3>
          <p className="text-gray-600">
            {isAdmin 
              ? (searchTerm ? 'Nenhum atleta encontrado com esse nome' : 'Não há tickets de pagamento aprovados')
              : 'Você ainda não tem tickets de pagamento aprovados'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => {
            const daysInfo = getDaysRemaining(ticket.days_remaining);
            
            return (
              <div key={ticket.ticket_id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ticket.user_name}
                    </h3>
                    {isAdmin && ticket.user_email && (
                      <p className="text-sm text-gray-600">{ticket.user_email}</p>
                    )}
                    {ticket.group_name && (
                      <p className="text-sm text-blue-600 font-medium">
                        📋 {ticket.category} - Grupo: {ticket.group_name}
                      </p>
                    )}
                    {ticket.payment_status && (
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
                        ticket.payment_status === 'Completo' 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      }`}>
                        {ticket.payment_status === 'Completo' ? '✓ PAGAMENTO COMPLETO' : '⏳ PAGAMENTO PARCIAL'}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      R$ {ticket.amount.toFixed(2)}
                    </div>
                    <div className={`text-sm ${daysInfo.color}`}>
                      {daysInfo.text}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-gray-500">Categoria</label>
                    <p className="font-medium">{ticket.category}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Método</label>
                    <p className="font-medium">{ticket.payment_method || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Aprovado em</label>
                    <p className="font-medium">{formatDate(ticket.approved_at)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Expira em</label>
                    <p className="font-medium">{formatDate(ticket.expires_at)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    ID: {ticket.ticket_id.slice(0, 8)}...
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {ticket.has_proof ? (
                      <button
                        onClick={() => handleViewProof(ticket)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-sm"
                      >
                        📎 Ver Comprovante
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">Sem comprovante</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para visualizar comprovante */}
      {showImage && selectedTicket && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedTicket.singleProof ? 
                  `Comprovante ${selectedTicket.proofIndex} - ${selectedTicket.user_name}` : 
                  `Comprovante - ${selectedTicket.user_name}`
                }
              </h3>
              <button
                onClick={handleCloseImage}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="text-center">
              {selectedTicket.proof_image_base64 ? (
                <img
                  src={selectedTicket.proof_image_base64}
                  alt="Comprovante"
                  className="max-w-full max-h-96 mx-auto border border-gray-200 rounded"
                />
              ) : (
                <div className="py-12">
                  <div className="text-6xl mb-4">⏳</div>
                  <p className="text-gray-600">Carregando comprovante...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentTickets;

