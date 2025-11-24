import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { exportGroupMembersToXLSX } from '../utils/exportXLSX';

function GroupMembers({ group, onClose }) {
  const [members, setMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [searchMembers, setSearchMembers] = useState('');
  const [searchAvailable, setSearchAvailable] = useState('');

  const loadMembers = useCallback(async () => {
    console.log('🔍 Carregando membros do grupo:', group.name, 'ID:', group.id);
    setLoading(true);
    try {
      // 1. Buscar membros do grupo (apenas IDs)
      console.log('🔍 Buscando membros do grupo ID:', group.id);
      const { data: membersData, error: membersError } = await supabase
        .from('user_group_members')
        .select('user_id, joined_at')
        .eq('group_id', group.id);

      if (membersError) {
        console.error('❌ Erro ao buscar membros:', membersError);
        setMembers([]);
        setAvailableUsers([]);
        return;
      }

      console.log('📋 Dados brutos dos membros:', membersData);
      console.log('📋 Membros encontrados:', membersData?.length || 0);

      if (!membersData || membersData.length === 0) {
        console.log('ℹ️ Grupo sem membros');
        setMembers([]);
        // Não retornar aqui, continuar para buscar usuários disponíveis
      } else {

      // 2. Para cada membro, buscar os dados do perfil individualmente
      const memberProfiles = [];
      const memberIds = membersData.map(m => m.user_id);
      console.log('🔍 Buscando perfis para IDs:', memberIds);

      // Buscar todos os perfis de uma vez COM TODOS OS DADOS
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, position, role, status, birth_date, rg, region, gender, responsible_name, responsible_phone')
        .in('id', memberIds);

      if (profilesError) {
        console.error('❌ Erro ao buscar perfis:', profilesError);
        // Tentar buscar um por um
        for (const member of membersData) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id, full_name, email, phone, position, role, status, birth_date, rg, region, gender, responsible_name, responsible_phone')
              .eq('id', member.user_id)
              .single();

            if (profileError) {
              console.error('❌ Erro ao buscar perfil:', profileError, 'ID:', member.user_id);
              continue;
            }

            memberProfiles.push({
              ...member,
              profiles: profile
            });
          } catch (error) {
            console.error('❌ Erro ao processar membro:', error);
          }
        }
      } else {
        console.log('✅ Perfis encontrados via bulk query:', profiles?.length || 0);
        // Combinar os dados
        memberProfiles.push(...membersData.map(member => {
          const profile = profiles?.find(p => p.id === member.user_id);
          return {
            ...member,
            profiles: profile || {}
          };
        }));
      }

      console.log('👥 Perfis dos membros carregados:', memberProfiles.length);
      setMembers(memberProfiles);
      }

      // 3. Buscar todos os usuários disponíveis (exceto o atual se estiver logado)
      let currentUserId = null;
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!authError && user) {
          currentUserId = user.id;
          console.log('👤 Usuário atual:', currentUserId);
        } else {
          console.log('ℹ️ Usuário não autenticado, mostrando todos os usuários');
        }
      } catch (error) {
        console.log('ℹ️ Erro na autenticação, mostrando todos os usuários:', error.message);
      }

      console.log('🔍 Buscando usuários disponíveis (aprovados e pendentes)...');
      let query = supabase
        .from('profiles')
        .select('id, full_name, email, phone, position, role, status')
        .in('status', ['approved', 'pending']); // Usuários aprovados E pendentes

      // TEMPORÁRIO: Removendo exclusão do usuário atual para debug
      // if (currentUserId) {
      //   query = query.neq('id', currentUserId);
      // }

      console.log('🔍 Query construída:', {
        table: 'profiles',
        status: ['approved', 'pending'],
        excludeUser: currentUserId || 'NENHUM (removido para debug)'
      });

      const { data: allUsers, error: usersError } = await query;

      if (usersError) {
        console.error('❌ Erro ao buscar usuários:', usersError);
        setAvailableUsers([]);
        setAllUsers([]);
        return;
      }

      console.log('✅ Consulta de usuários executada com sucesso');
      console.log('📊 Query executada:', query); // Log da query
      console.log('🏃 Usuários retornados da query:', allUsers?.length || 0);
      console.log('📋 Dados dos usuários retornados:', allUsers);
      console.log('👤 Usuário atual que está sendo excluído:', currentUserId);

      // Salvar todos os usuários para usar na renderização
      setAllUsers(allUsers || []);

      // 4. Filtrar apenas os que não estão no grupo
      const existingMemberIds = new Set(membersData.map(m => m.user_id));
      const available = allUsers?.filter(user => !existingMemberIds.has(user.id)) || [];

      console.log('✅ Usuários para adicionar:', available.length);
      console.log('📝 IDs dos membros existentes:', Array.from(existingMemberIds));
      console.log('👥 Usuários disponíveis:', available);
      setAvailableUsers(available);

    } catch (error) {
      console.error('❌ Erro geral ao carregar membros:', error);
      setError('Erro ao carregar dados do grupo. Verifique sua conexão e tente novamente.');
      setMembers([]);
      setAvailableUsers([]);
    } finally {
      setLoading(false);
    }
  }, [group.id, group.name]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleAddMember = async (userId) => {
    const userToAdd = availableUsers.find(u => u.id === userId);

    // Verificar se o usuário é pendente
    if (userToAdd?.status === 'pending') {
      if (!window.confirm(`O usuário ${userToAdd.full_name} ainda está com status "Pendente" e precisa ser aprovado primeiro. Deseja adicionar mesmo assim?`)) {
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('user_group_members')
        .insert({
          user_id: userId,
          group_id: group.id
        });

      if (error) throw error;

      loadMembers(); // Recarregar lista

    } catch (error) {
      console.error('Erro ao adicionar membro:', error);
      alert('Erro ao adicionar membro: ' + error.message);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Tem certeza que deseja remover este membro do grupo?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_group_members')
        .delete()
        .eq('user_id', userId)
        .eq('group_id', group.id);

      if (error) throw error;

      loadMembers(); // Recarregar lista

    } catch (error) {
      console.error('Erro ao remover membro:', error);
      alert('Erro ao remover membro: ' + error.message);
    }
  };

  const handleExportToExcel = async () => {
    if (members.length === 0) {
      alert('⚠️ Não há membros neste grupo para exportar!');
      return;
    }

    try {
      console.log('📊 Exportando membros do grupo para Excel...');
      console.log('📋 Membros:', members);
      
      // Exportar usando a função utilitária
      exportGroupMembersToXLSX(members, group.name);
      
      alert(`✅ Excel gerado com sucesso!\n\n📊 ${members.length} atleta(s) exportado(s)\n📁 Arquivo: ${group.name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      alert('Erro ao gerar Excel: ' + error.message);
    }
  };

  // ===== HOOKS DE FILTRO (DEVEM VIR ANTES DOS RETURNS) =====
  // Filtrar membros pela busca (nome, email, posição, telefone)
  const filteredMembers = React.useMemo(() => {
    const searchLower = searchMembers.toLowerCase().trim();
    if (!searchLower) return members;
    
    return members.filter(member => {
      const name = (member.profiles?.full_name || '').toLowerCase();
      const email = (member.profiles?.email || '').toLowerCase();
      const position = (member.profiles?.position || '').toLowerCase();
      const phone = (member.profiles?.phone || '').toLowerCase();
      
      return name.includes(searchLower) || email.includes(searchLower) || position.includes(searchLower) || phone.includes(searchLower);
    });
  }, [members, searchMembers]);

  // Filtrar usuários disponíveis pela busca (nome, email, posição, telefone)
  const filteredAvailable = React.useMemo(() => {
    const searchLower = searchAvailable.toLowerCase().trim();
    if (!searchLower) return availableUsers;
    
    return availableUsers.filter(user => {
      const name = (user.full_name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const position = (user.position || '').toLowerCase();
      const phone = (user.phone || '').toLowerCase();
      
      return name.includes(searchLower) || email.includes(searchLower) || position.includes(searchLower) || phone.includes(searchLower);
    });
  }, [availableUsers, searchAvailable]);
  // ===== FIM DOS HOOKS DE FILTRO =====

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Carregando...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Erro</h3>
              <p className="text-red-600">{error}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-6xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Membros do Grupo</h3>
                <p className="text-gray-600">{group.name} - {group.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                {members.length > 0 && (
                  <button
                    onClick={handleExportToExcel}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    title="Exportar dados dos atletas para Excel"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>📊 Exportar Excel</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Membros Atuais */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                Membros Atuais ({filteredMembers.length}/{members.length})
              </h4>
            </div>
            
            {/* Barra de pesquisa - Membros Atuais */}
            {members.length > 0 && (
              <div className="mb-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Buscar por nome, email, telefone ou posição..."
                    value={searchMembers}
                    onChange={(e) => setSearchMembers(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchMembers && (
                    <button
                      onClick={() => setSearchMembers('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      title="Limpar busca"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {members.length === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum membro no grupo</p>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Nenhum membro encontrado</p>
                <p className="text-xs text-gray-400">Tente buscar por outro termo</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {filteredMembers.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{member.profiles?.full_name || 'Nome não disponível'}</p>
                      <p className="text-sm text-gray-500">{member.profiles?.phone || 'Telefone não disponível'}</p>
                      {member.profiles?.email && (
                        <p className="text-sm text-gray-400 text-xs">📧 {member.profiles.email}</p>
                      )}
                      {member.profiles?.position && (
                        <span className="text-xs text-blue-600">{member.profiles.position}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="text-red-600 hover:text-red-900"
                      title="Remover do grupo"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usuários Disponíveis */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                Adicionar Membros ({filteredAvailable.length}/{availableUsers.length})
              </h4>
            </div>
            <p className="text-xs text-gray-500 mb-3">Usuários disponíveis (aprovados e pendentes)</p>
            
            {/* Barra de pesquisa - Usuários Disponíveis */}
            {availableUsers.length > 0 && (
              <div className="mb-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Buscar por nome, email, telefone ou posição..."
                    value={searchAvailable}
                    onChange={(e) => setSearchAvailable(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                  <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchAvailable && (
                    <button
                      onClick={() => setSearchAvailable('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                      title="Limpar busca"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {availableUsers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-2">Nenhum usuário disponível para adicionar</p>
                <p className="text-xs text-gray-400">
                  {allUsers?.length === 0
                    ? 'Não há usuários no sistema'
                    : 'Todos os usuários já estão neste grupo'
                  }
                </p>
              </div>
            ) : filteredAvailable.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Nenhum usuário encontrado</p>
                <p className="text-xs text-gray-400">Tente buscar por outro termo</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {filteredAvailable.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.phone || 'Telefone não disponível'}</p>
                      {user.email && (
                        <p className="text-sm text-gray-400 text-xs">📧 {user.email}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.status === 'approved' ? 'bg-green-100 text-green-800' :
                          user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {user.status === 'approved' ? 'Aprovado' :
                           user.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </span>
                      </div>
                      {user.position && (
                        <span className="text-xs text-blue-600">{user.position}</span>
                      )}
                      {user.status === 'pending' && (
                        <p className="text-xs text-yellow-600 mt-1">⚠️ Usuário precisa ser aprovado primeiro</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddMember(user.id)}
                      className="text-green-600 hover:text-green-900"
                      title="Adicionar ao grupo"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroupMembers;

