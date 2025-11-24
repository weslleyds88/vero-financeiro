import React, { useState, useEffect, useCallback } from 'react';
import GroupMembers from './GroupMembers';

function AdminPanel({ isAdmin, supabase }) {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    type: 'team'
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔍 Carregando dados do painel administrativo...');

      // Carregar usuários pendentes de aprovação (COM FOTOS)
      const { data: pending, error: pendingError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, position, role, status, account_status, birth_date, rg, region, gender, responsible_name, responsible_phone, avatar_url, created_at, updated_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('❌ Erro ao buscar pendentes:', pendingError);
        throw pendingError;
      }

      console.log('📋 Usuários pendentes encontrados:', pending?.length || 0);
      console.log('📋 Dados dos pendentes:', pending);
      setPendingUsers(pending || []);

      // Lista completa de usuários agora está na página "Atletas".

      // Carregar grupos
      const { data: groupsData, error: groupsError } = await supabase
        .from('user_groups')
        .select('*')
        .order('name');

      if (groupsError) {
        console.error('❌ Erro ao buscar grupos:', groupsError);
        throw groupsError;
      }

      console.log('🏗️ Grupos encontrados:', groupsData?.length || 0);
      setGroups(groupsData || []);

    } catch (error) {
      console.error('❌ Erro geral ao carregar dados:', error.message);
      // Manter dados anteriores em caso de erro
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Removido: carregamento da aba de usuários

  const handleCreateGroup = () => {
    setEditingGroup(null);
    setGroupFormData({
      name: '',
      description: '',
      type: 'team'
    });
    setShowGroupForm(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description,
      type: group.type
    });
    setShowGroupForm(true);
  };

  const handleGroupFormSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingGroup) {
        // Atualizar grupo
        const { error } = await supabase
          .from('user_groups')
          .update({
            name: groupFormData.name,
            description: groupFormData.description,
            type: groupFormData.type
          })
          .eq('id', editingGroup.id);

        if (error) throw error;
      } else {
        // Criar novo grupo
        const { error } = await supabase
          .from('user_groups')
          .insert({
            name: groupFormData.name,
            description: groupFormData.description,
            type: groupFormData.type
          });

        if (error) throw error;

        // Não vamos adicionar automaticamente a um grupo padrão por enquanto
        // Isso pode ser feito manualmente depois
      }

      setShowGroupForm(false);
      loadData();

    } catch (error) {
      console.error('Erro ao salvar grupo:', error);
      alert('Erro ao salvar grupo: ' + error.message);
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'approved' })
        .eq('id', userId);

      if (error) throw error;

      // Recarregar dados
      loadData();

      // Por enquanto, não vamos adicionar automaticamente a um grupo
      // O admin pode fazer isso manualmente através da interface de grupos

    } catch (error) {
      console.error('Erro ao aprovar usuário:', error.message);
    }
  };

  const handleRejectUser = async (userId, userName) => {
    if (!window.confirm(`⚠️ Tem certeza que deseja REJEITAR e EXCLUIR o cadastro de ${userName}?\n\nEsta ação NÃO pode ser desfeita!\nO usuário precisará fazer um novo cadastro.`)) {
      return;
    }

    try {
      console.log('🗑️ Excluindo usuário rejeitado:', userId);
      
      // DELETAR completamente do banco de dados
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      alert('✅ Cadastro rejeitado e excluído com sucesso!');
      loadData();

    } catch (error) {
      console.error('❌ Erro ao rejeitar usuário:', error.message);
      alert('Erro ao rejeitar usuário: ' + error.message);
    }
  };

  // Removidos: handlers de gestão de usuários (migrado para Atletas)

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      loadData();

    } catch (error) {
      console.error('Erro ao excluir grupo:', error);
      alert('Erro ao excluir grupo: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
            <p className="text-gray-600 mt-2">Gerencie usuários, grupos e aprovações</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Aprovações Pendentes ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'groups'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Grupos ({groups.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Cadastros Pendentes de Aprovação</h2>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              🔄 Atualizar
            </button>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum cadastro pendente</h3>
              <p className="mt-1 text-sm text-gray-500">Todos os cadastros estão aprovados!</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {pendingUsers.map((user) => (
                <div key={user.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex flex-col space-y-4">
                    {/* Header com foto e ações */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name}
                              className="w-20 h-20 rounded-full object-cover border-4 border-blue-300 shadow-md"
                              onError={(e) => {
                                // Fallback para inicial se imagem falhar
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center border-4 border-blue-300 shadow-md"
                            style={{ display: user.avatar_url ? 'none' : 'flex' }}
                          >
                            <span className="text-blue-600 font-bold text-2xl">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{user.full_name}</h3>
                          <span className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full mt-1">
                            ⏳ Aguardando Aprovação
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveUser(user.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          ✓ Aprovar
                        </button>
                        <button
                          onClick={() => handleRejectUser(user.id, user.full_name)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          ✗ Rejeitar
                        </button>
                      </div>
                    </div>

                    {/* Dados do cadastro em grid */}
                    <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Coluna 1 */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase">📧 Email</label>
                          <p className="text-sm text-gray-900">{user.email}</p>
                        </div>
                        
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase">📱 Telefone (WhatsApp)</label>
                          <p className="text-sm text-gray-900">{user.phone || 'Não informado'}</p>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase">🎂 Data de Nascimento</label>
                          <p className="text-sm text-gray-900">
                            {user.birth_date ? new Date(user.birth_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informado'}
                          </p>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase">🆔 RG</label>
                          <p className="text-sm text-gray-900">{user.rg || 'Não informado'}</p>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase">📍 Região de SP</label>
                          <p className="text-sm text-gray-900">{user.region || 'Não informado'}</p>
                        </div>
                      </div>

                      {/* Coluna 2 */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase">⚧ Gênero</label>
                          <p className="text-sm text-gray-900">{user.gender || 'Não informado'}</p>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase">🏐 Posição no Time</label>
                          <p className="text-sm text-gray-900">
                            {user.position ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                {user.position}
                              </span>
                            ) : (
                              'Não informado'
                            )}
                          </p>
                        </div>

                        {(user.responsible_name || user.responsible_phone) && (
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <label className="text-xs font-semibold text-blue-700 uppercase block mb-2">👨‍👩‍👦 Dados do Responsável</label>
                            {user.responsible_name && (
                              <div className="mb-1">
                                <span className="text-xs text-blue-600">Nome:</span>
                                <p className="text-sm text-blue-900 font-medium">{user.responsible_name}</p>
                              </div>
                            )}
                            {user.responsible_phone && (
                              <div>
                                <span className="text-xs text-blue-600">Telefone:</span>
                                <p className="text-sm text-blue-900 font-medium">{user.responsible_phone}</p>
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase">📅 Data de Cadastro</label>
                          <p className="text-sm text-gray-900">
                            {new Date(user.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Grupos</h2>
            <button
              onClick={handleCreateGroup}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Novo Grupo
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{group.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      group.type === 'monthly' ? 'bg-green-100 text-green-800' :
                      group.type === 'tournament' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {group.type === 'monthly' ? 'Mensalidade' :
                       group.type === 'tournament' ? 'Torneio' :
                       group.type === 'team' ? 'Equipe' : group.type}
                    </span>
                    <div className="relative">
                      <button
                        onClick={() => {
                          const menu = document.getElementById(`group-menu-${group.id}`);
                          menu.classList.toggle('hidden');
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="Opções"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      <div
                        id={`group-menu-${group.id}`}
                        className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border"
                      >
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleEditGroup(group);
                              document.getElementById(`group-menu-${group.id}`).classList.add('hidden');
                            }}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              handleDeleteGroup(group.id);
                              document.getElementById(`group-menu-${group.id}`).classList.add('hidden');
                            }}
                            className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-100 w-full text-left"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedGroup(group)}
                      className="text-green-600 hover:text-green-900"
                      title="Gerenciar Membros"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                <p className="text-xs text-gray-500">
                  Criado em: {new Date(group.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal do Formulário de Grupo */}
      {showGroupForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
              </h3>
              <button
                onClick={() => setShowGroupForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleGroupFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Grupo
                </label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({...groupFormData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Equipe Principal"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({...groupFormData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrição do grupo"
                  rows="3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={groupFormData.type}
                  onChange={(e) => setGroupFormData({...groupFormData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="team">Equipe</option>
                  <option value="monthly">Mensalidade</option>
                  <option value="tournament">Torneio/Campeonato</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  💡 Dica: Use "Equipe" para grupos de treinamento
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGroupForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  {editingGroup ? 'Atualizar' : 'Criar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Membros do Grupo */}
      {selectedGroup && (
        <GroupMembers
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
        />
      )}

      {/* Aba de tickets removida; os tickets possuem página própria */}
    </div>
  );
}

export default AdminPanel;

