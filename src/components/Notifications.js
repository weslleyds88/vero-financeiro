import React, { useState, useEffect, useCallback, useRef } from 'react';

const Notifications = ({ supabase, currentUser, isVisible = true }) => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const createNotificationsTable = useCallback(async () => {
    try {
      await supabase.rpc('create_notifications_table_if_not_exists');
      console.log('✅ Tabela notifications criada');
    } catch (createError) {
      console.error('❌ Erro ao criar tabela:', createError);
      throw createError;
    }
  }, [supabase]);

  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;

    console.log('🔍 Carregando notificações para usuário:', currentUser.id);

    try {
      // Query direta para notificações não lidas do usuário atual
      // Primeiro tentar com coluna 'read', se não existir, usar 'is_read'
      let { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(50);

      // Se erro de coluna não encontrada, tentar com 'is_read'
      if (error && error.code === '42703') {
        console.log('🔄 Coluna read não encontrada, tentando com is_read...');
        const result = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(50);
        
        data = result.data;
        error = result.error;
      }

      // Se ainda erro, tentar sem filtro de leitura
      if (error && error.code === '42703') {
        console.log('🔄 Coluna de leitura não encontrada, carregando todas as notificações...');
        const result = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        data = result.data;
        error = result.error;
      }

      console.log('📊 Query result:', { data, error });

      if (error) {
        console.error('❌ Erro na query:', error);
        // Se erro 42P01 (tabela não existe), criar tabela
        if (error.code === '42P01' || error.message?.includes('relation "notifications" does not exist')) {
          console.log('📝 Tabela notifications não existe, criando...');
          try {
            await createNotificationsTable();
            // Recarregar após criar tabela
            await loadNotifications();
            return;
          } catch (createError) {
            console.error('❌ Erro ao criar tabela:', createError);
            throw createError;
          }
        }
        throw error;
      }

      console.log('✅ Notificações do usuário (não lidas):', data?.length || 0);
      console.log('📋 Notificações encontradas:', data?.map(n => ({ id: n.id, title: n.title, type: n.type })) || []);

      setNotifications(data || []);
    } catch (error) {
      console.error('❌ Erro ao carregar notificações:', error);
      setNotifications([]);
    }
  }, [currentUser, supabase, createNotificationsTable]);

  const markAsRead = async (notificationId) => {
    try {
      // Tentar primeiro com coluna 'read'
      let { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      // Se erro de coluna não encontrada, tentar com 'is_read'
      if (error && error.code === '42703') {
        console.log('🔄 Tentando com coluna is_read...');
        const result = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId);
        error = result.error;
      }

      // Se ainda erro, apenas remover da lista local
      if (error) {
        console.error('❌ Erro ao marcar notificação como lida:', error);
        // Mesmo com erro, remover da lista local para melhor UX
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        return;
      }

      // Remover notificação da lista local
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log('✅ Notificação marcada como lida e removida da lista');
    } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
      // Mesmo com erro, remover da lista local
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;

    try {
      // Tentar primeiro com coluna 'read'
      let { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);

      // Se erro de coluna não encontrada, tentar com 'is_read'
      if (error && error.code === '42703') {
        console.log('🔄 Tentando com coluna is_read...');
        const result = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', currentUser.id)
          .eq('is_read', false);
        error = result.error;
      }

      if (error) {
        console.error('❌ Erro ao marcar todas como lidas:', error);
        // Mesmo com erro, limpar lista local para melhor UX
        setNotifications([]);
        return;
      }

      // Limpar lista local
      setNotifications([]);
      console.log('✅ Todas as notificações marcadas como lidas');
    } catch (error) {
      console.error('❌ Erro ao marcar todas como lidas:', error);
      // Mesmo com erro, limpar lista local
      setNotifications([]);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Atualizar notificações periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications();
    }, 5000); // Atualizar a cada 5 segundos para notificações em tempo real

    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Fechar dropdown quando clica fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!currentUser || !isVisible) return null;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão de Notificações - com ícone de sino */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Notificações"
        >
          {/* Ícone de sino */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold animate-pulse">
              {notifications.length}
            </span>
          )}
        </button>

        {/* Indicador se não há notificações */}
        {notifications.length === 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        )}
      </div>

      {/* Dropdown de Notificações */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <span className="mr-2">🔔</span>
                Notificações ({notifications.length})
              </h3>
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Marcar todas como lidas
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${getNotificationColor(notification.type)}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                      <h4 className="font-medium text-gray-900 text-sm">{notification.title}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    className="text-gray-400 hover:text-gray-600 ml-2 p-1"
                    title="Marcar como lida"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              Clique em uma notificação para marcá-la como lida
            </p>
          </div>
        </div>
      )}

      {/* Mensagem quando não há notificações */}
      {isOpen && notifications.length === 0 && currentUser && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">Nenhuma notificação</h3>
            <p className="text-xs text-gray-500">Você está em dia com tudo!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;

