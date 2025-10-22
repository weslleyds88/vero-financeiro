import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatDate, formatCurrency } from '../utils/dateUtils';
import ExportButtons from './ExportButtons';

const MemberView = ({ db, members, payments }) => {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [memberPayments, setMemberPayments] = useState([]);
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0,
    lastPayment: null
  });

  useEffect(() => {
    loadMemberData();
  }, [id, payments]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMemberData = () => {
    if (id && members.length > 0) {
      const foundMember = members.find(m => m.id === parseInt(id));
      setMember(foundMember);
      
      if (foundMember) {
        const memberPayments = payments.filter(p => p.member_id === foundMember.id);
        setMemberPayments(memberPayments);
        
        // Calcular estatísticas
        const paidPayments = memberPayments.filter(p => p.status === 'paid');
        const pendingPayments = memberPayments.filter(p => p.status === 'pending');
        
        const totalPaid = paidPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const totalPending = pendingPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        
        const lastPayment = paidPayments
          .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))[0];

        setStats({
          totalPaid,
          totalPending,
          paidCount: paidPayments.length,
          pendingCount: pendingPayments.length,
          lastPayment
        });
      }
    }
  };

  const handleMarkPaid = async (paymentId) => {
    const success = await db.markPaid(paymentId);
    if (success) {
      // Recarregar dados após marcar como pago
      loadMemberData();
    } else {
      alert('Erro ao marcar pagamento como pago');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', label: 'Pendente' },
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

  const getCategoryIcon = (category) => {
    const icons = {
      'Mensalidade': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      'Uniforme': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      'Taxa de Inscrição': (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    };
    
    return icons[category] || (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
  };

  if (!member) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Atleta não encontrado</h2>
          <p className="text-gray-600 mt-2">O atleta solicitado não foi encontrado.</p>
          <Link to="/members" className="btn btn-primary mt-4">
            Voltar para Atletas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center">
          <Link
            to="/members"
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-16">
              <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-600 font-bold text-xl">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
              <div className="mt-1 space-y-1">
                {member.phone && (
                  <p className="text-gray-600 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {member.phone}
                  </p>
                )}
                <p className="text-gray-500 text-sm">
                  Membro desde {formatDate(member.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <ExportButtons 
            members={[member]}
            payments={memberPayments}
            db={db}
            showBackup={false}
          />
        </div>
      </div>

      {/* Observação do Sócio */}
      {member.observation && (
        <div className="card p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Observações</h3>
          <p className="text-gray-900">{member.observation}</p>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <svg className="w-6 h-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pago</p>
              <p className="text-2xl font-bold text-success-600">{formatCurrency(stats.totalPaid)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pendente</p>
              <p className="text-2xl font-bold text-warning-600">{formatCurrency(stats.totalPending)}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pagamentos</p>
              <p className="text-2xl font-bold text-primary-600">{stats.paidCount}/{stats.paidCount + stats.pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Último Pagamento</p>
              <p className="text-sm font-bold text-gray-900">
                {stats.lastPayment ? formatDate(stats.lastPayment.paid_at) : 'Nenhum'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de Pagamentos */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Histórico de Pagamentos</h3>
        </div>
        
        {memberPayments.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {memberPayments
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map((payment) => (
                <div key={payment.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-gray-100 rounded-lg mr-4">
                        {getCategoryIcon(payment.category)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">{payment.category}</h4>
                          {getStatusBadge(payment.status)}
                        </div>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-600">
                            Vencimento: {formatDate(payment.due_date)}
                          </p>
                          {payment.paid_at && (
                            <p className="text-sm text-success-600">
                              Pago em: {formatDate(payment.paid_at)}
                            </p>
                          )}
                          {payment.observation && (
                            <p className="text-sm text-gray-500">{payment.observation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Criado em {formatDate(payment.created_at)}
                        </p>
                      </div>
                      
                      {payment.status === 'pending' && (
                        <button
                          onClick={() => handleMarkPaid(payment.id)}
                          className="btn btn-success btn-sm"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Marcar Pago
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum pagamento registrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Este sócio ainda não possui pagamentos registrados.
            </p>
            <div className="mt-6">
              <Link to="/payments" className="btn btn-primary">
                Adicionar Pagamento
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberView;
