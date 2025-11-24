import React, { useState, useEffect, useMemo } from 'react';
import MemberForm from './MemberForm';
import { formatDate } from '../utils/dateUtils';

const Members = ({ db, members, onRefresh, isAdmin, supabase }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState(null); // quando admin, carrega lista completa com avatar
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' ou 'desc'

  const sourceList = allUsers !== null && isAdmin ? allUsers : members;

  // Memoizar filtros e ordenação para evitar recálculos desnecessários
  const sortedAndFilteredMembers = useMemo(() => {
    if (!sourceList || sourceList.length === 0) return [];
    
    const filtered = sourceList.filter(member =>
      member && (member.full_name || member.name) && (
        (member.full_name || member.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.phone && member.phone.includes(searchTerm))
      )
    );

    return filtered
      .filter(member => member && member.id) // Proteção adicional
      .sort((a, b) => {
        const nameA = (a.full_name || a.name || '').toLowerCase();
        const nameB = (b.full_name || b.name || '').toLowerCase();
        if (sortOrder === 'asc') {
          return nameA.localeCompare(nameB);
        } else {
          return nameB.localeCompare(nameA);
        }
      });
  }, [sourceList, searchTerm, sortOrder]);

  const handleEditMember = (member) => {
    if (!isAdmin) {
      return;
    }
    setEditingMember(member);
    setShowForm(true);
  };

  const handleDeleteMember = async (id) => {
    if (!isAdmin) {
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir este atleta? Esta ação não pode ser desfeita.')) {
      const success = await db.deleteMember(id);
      if (success) {
        onRefresh();
      } else {
        alert('Erro ao excluir atleta');
      }
    }
  };

  const handleFormSubmit = async (memberData) => {
    if (!supabase) {
      alert('Erro: Supabase não configurado');
      return;
    }

    try {
      if (editingMember) {
        // Atualizar perfil existente na tabela profiles
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: memberData.full_name || memberData.name,
            phone: memberData.phone,
            observation: memberData.observation,
            position: memberData.position,
            birth_date: memberData.birth_date,
            rg: memberData.rg,
            region: memberData.region,
            gender: memberData.gender,
            responsible_name: memberData.responsible_name,
            responsible_phone: memberData.responsible_phone,
            avatar_url: memberData.avatar_url
          })
          .eq('id', editingMember.id);

        if (error) throw error;
      } else {
        // Não permitir criar novos atletas aqui - eles devem se registrar
        alert('Novos atletas devem se registrar através da página de registro.');
        return;
      }

      setShowForm(false);
      setEditingMember(null);
      onRefresh();
    } catch (error) {
      console.error('Erro ao salvar atleta:', error);
      alert('Erro ao salvar atleta: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingMember(null);
  };

  // Carregar lista completa de usuários (com avatar) quando admin
  useEffect(() => {
    const loadAll = async () => {
      if (!isAdmin || !supabase) return;
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, phone, position, role, status, account_status, avatar_url, created_at, observation, birth_date, rg, region, gender, responsible_name, responsible_phone')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setAllUsers(data || []);
      } catch (e) {
        console.error('Erro ao carregar usuários:', e);
        setAllUsers(null);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, supabase]);

  return (
    <div className="p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Atletas</h2>
          <div className="flex items-center space-x-3">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="asc">A-Z ↑</option>
              <option value="desc">Z-A ↓</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar atleta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      <div className="card">
        {loadingUsers ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando atletas...</p>
          </div>
        ) : sortedAndFilteredMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                  {isAdmin && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Função</th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Observação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Cadastro
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAndFilteredMembers.map((member) => {
                  // Proteção contra member undefined
                  if (!member) {
                    return null;
                  }
                  
                  if (!member.id) {
                    return null;
                  }

                  const memberName = member.full_name || member.name;
                  const memberPhone = member.phone;

                  return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={memberName}
                              className="h-10 w-10 rounded-full object-cover border"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div 
                            className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center"
                            style={{ display: member.avatar_url ? 'none' : 'flex' }}
                          >
                            <span className="text-primary-600 font-medium text-sm">
                              {memberName?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {memberName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {memberPhone || '-'}
                    </td>
                    {isAdmin && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            member.status === 'approved' ? 'bg-green-100 text-green-800' :
                            member.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {member.status === 'approved' ? 'Aprovado' : member.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            member.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {member.role === 'admin' ? 'Administrador' : 'Jogador'}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {member.observation || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(member.created_at)}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={async () => {
                              if (!member.id) {
                                console.error('Member ID é undefined:', member);
                                alert('Erro: ID do atleta não disponível');
                                return;
                              }

                              const isCurrentlyAdmin = member.role === 'admin';
                              const action = isCurrentlyAdmin ? 'remover os privilégios de administrador de' : 'promover a administrador';
                              
                              if (!window.confirm(
                                `⚠️ ATENÇÃO: Tem certeza que deseja ${action} ${member.full_name || member.name}?\n\n` +
                                (isCurrentlyAdmin 
                                  ? 'Esta pessoa perderá acesso ao painel administrativo e voltará a ter visão de jogador.'
                                  : 'Esta pessoa terá acesso completo ao painel administrativo e todas as funcionalidades de admin.')
                              )) {
                                return;
                              }

                              try {
                                const newRole = isCurrentlyAdmin ? 'user' : 'admin';
                                
                                const { error } = await supabase
                                  .from('profiles')
                                  .update({ role: newRole })
                                  .eq('id', member.id);

                                if (error) throw error;

                                alert(`✅ ${isCurrentlyAdmin ? 'Privilégios de administrador removidos' : 'Usuário promovido a administrador'} com sucesso!\n\n` +
                                      `${member.full_name || member.name} agora tem ${newRole === 'admin' ? 'acesso de administrador' : 'visão de jogador'}.\n\n` +
                                      (newRole === 'admin' 
                                        ? '⚠️ A pessoa precisará fazer logout e login novamente para ver as mudanças.'
                                        : ''));
                                
                                // Recarregar dados
                                onRefresh();
                                
                                // Recarregar lista de usuários
                                const { data, error: reloadError } = await supabase
                                  .from('profiles')
                                  .select('id, email, full_name, phone, position, role, status, account_status, avatar_url, created_at, observation, birth_date, rg, region, gender, responsible_name, responsible_phone')
                                  .order('created_at', { ascending: false });
                                
                                if (!reloadError && data) {
                                  setAllUsers(data);
                                }
                              } catch (e) {
                                console.error('Erro ao alterar role:', e);
                                alert('Erro ao alterar privilégios: ' + (e.message || 'desconhecido'));
                              }
                            }}
                            className={`${member.role === 'admin' ? 'text-orange-600 hover:text-orange-900' : 'text-purple-600 hover:text-purple-900'}`}
                            title={member.role === 'admin' ? 'Remover privilégios de admin' : 'Promover a administrador'}
                          >
                            {member.role === 'admin' ? '👑' : '⭐'}
                          </button>
                          <button
                            onClick={async () => {
                              if (!member.id) {
                                console.error('Member ID é undefined:', member);
                                alert('Erro: ID do atleta não disponível');
                                return;
                              }

                              console.log('Resetando senha para:', member.id, member.full_name || member.name);

                              if (!window.confirm(`Gerar nova senha temporária para ${member.full_name || member.name}?`)) return;
                              
                              try {
                                // Obter token de autenticação
                                let { data: session } = await supabase.auth.getSession();
                                console.log('Sessão inicial:', session);
                                
                                if (!session?.session) {
                                  console.log('Sessão não encontrada, tentando refresh...');
                                  await supabase.auth.refreshSession();
                                  const refreshed = await supabase.auth.getSession();
                                  session = refreshed.data;
                                  console.log('Sessão após refresh:', session);
                                }
                                
                                const token = session?.session?.access_token;
                                if (!token) {
                                  alert('Sessão inválida. Faça login novamente.');
                                  return;
                                }

                                console.log('Fazendo requisição para reset de senha...');

                                // Obter URL do Supabase do cliente
                                const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
                                
                                if (!supabaseUrl) {
                                  throw new Error('URL do Supabase não configurada');
                                }

                                // Chamar Supabase Edge Function
                                const functionUrl = `${supabaseUrl}/functions/v1/admin-reset-password`;
                                
                                const resp = await fetch(functionUrl, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                    'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY || ''
                                  },
                                  body: JSON.stringify({ 
                                    userId: member.id
                                  })
                                });

                                console.log('Resposta HTTP:', resp.status, resp.statusText);

                                const json = await resp.json();
                                console.log('Resposta JSON:', json);

                                if (!resp.ok) {
                                  const errorMsg = json.error || json.detail || 'Falha ao resetar senha';
                                  const errorDetail = json.detail ? `\n\nDetalhes: ${JSON.stringify(json.detail)}` : '';
                                  throw new Error(errorMsg + errorDetail);
                                }

                                const newPassword = json.password;
                                await navigator.clipboard.writeText(newPassword).catch(() => {});
                                alert(`✅ Senha resetada com sucesso!\n\nNova senha temporária: ${newPassword}\n\n(Senha copiada para a área de transferência)\n\nO atleta precisará trocar a senha no próximo login.`);
                              } catch (e) {
                                console.error('Erro completo no reset de senha:', e);
                                alert('Erro ao resetar senha: ' + (e.message || 'desconhecido'));
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Resetar senha"
                          >
                            🔑
                          </button>
                          <button
                            onClick={() => handleEditMember(member)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="text-danger-600 hover:text-danger-900"
                            title="Excluir"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum atleta encontrado.</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Tente ajustar sua busca.' : 'Nenhum atleta cadastrado ainda.'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Atletas</p>
              <p className="text-2xl font-bold text-gray-900">{sourceList.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Com Telefone</p>
              <p className="text-2xl font-bold text-gray-900">
                {sourceList.filter(m => m.phone).length}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Com Observações</p>
              <p className="text-2xl font-bold text-gray-900">
                {sourceList.filter(m => m.observation).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <MemberForm
              title={editingMember ? 'Editar Atleta' : 'Novo Atleta'}
              member={editingMember}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
