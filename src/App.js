import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { createAdapter } from './adapters';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Members from './components/Members';
import Payments from './components/Payments';
import Expenses from './components/Expenses';
import CalendarView from './components/CalendarView';
import MemberView from './components/MemberView';
import Settings from './components/Settings';
import AdminPanel from './components/AdminPanel';
import PaymentTickets from './components/PaymentTickets';
import AthleteProfile from './components/AthleteProfile';
import ForceChangePassword from './components/ForceChangePassword';
import Notifications from './components/Notifications';
import { getCurrentMonth, getCurrentMonthObj } from './utils/dateUtils';
import { supabase } from './lib/supabaseClient';

function AppContent() {
  const { isAuthenticated, isAdmin, login, logout, loading } = useAuth();
  const [db] = useState(() => createAdapter(process.env.REACT_APP_DB_MODE || 'local'));
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({
    member_id: '',
    status: '',
    category: '',
    month: getCurrentMonthObj()
  });

  // Carregar usuário atual do Supabase se autenticado
  useEffect(() => {
    if (isAuthenticated && supabase) {
      const loadCurrentUser = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            if (profile) {
              setCurrentUser(profile);
            }
          }
        } catch (error) {
          console.error('Erro ao carregar usuário:', error);
        }
      };
      loadCurrentUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Carregar dados iniciais apenas se autenticado
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      const [membersData, paymentsData] = await Promise.all([
        db.listMembers(),
        db.listPayments()
      ]);
      setMembers(membersData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const refreshMembers = async () => {
    if (isAdmin) { // Apenas admin pode editar
      const membersData = await db.listMembers();
      setMembers(membersData);
    }
  };

  const refreshPayments = async () => {
    if (isAdmin) { // Apenas admin pode editar
      const paymentsData = await db.listPayments();
      setPayments(paymentsData);
    } else {
      loadData(); // Recarrega dados no modo visualização
    }
  };

  const refreshData = () => {
    if (isAuthenticated) {
      loadData();
    }
  };

  // Se ainda carregando autenticação
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não autenticado, mostrar login
  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  // Se precisa trocar senha, mostrar tela de troca obrigatória
  if (currentUser?.must_change_password && supabase) {
    return (
      <ForceChangePassword
        currentUser={currentUser}
        onPasswordChanged={async () => {
          // Recarregar dados do usuário após trocar senha
          if (supabase) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
              if (profile) {
                setCurrentUser(profile);
              }
            }
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar 
        isAdmin={isAdmin} 
        onLogout={logout} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentUser={currentUser}
      />
      
      {/* Botão hambúrguer para mobile */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-30 md:hidden bg-white p-3 rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center"
        aria-label="Abrir menu"
      >
        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Notificações - Posicionado para não sobrepor os botões do header */}
      {currentUser && supabase && (
        <div className="fixed top-20 right-4 z-40 md:top-20">
          <Notifications supabase={supabase} currentUser={currentUser} />
        </div>
      )}
      
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                db={db}
                members={members}
                payments={payments}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                onRefresh={refreshData}
                isAdmin={isAdmin}
                supabase={supabase}
                currentUser={currentUser}
              />
            }
          />
          <Route
            path="/members"
            element={
              <Members
                db={db}
                members={members}
                onRefresh={refreshMembers}
                isAdmin={isAdmin}
                supabase={supabase}
              />
            }
          />
          <Route
            path="/payments"
            element={
              <Payments
                db={db}
                members={members}
                payments={payments}
                onRefresh={refreshPayments}
                isAdmin={isAdmin}
                supabase={supabase}
                currentUser={currentUser}
              />
            }
          />
          <Route
            path="/expenses"
            element={
              <Expenses
                db={db}
                payments={payments}
                members={members}
                currentMonth={filters.month}
                onMonthChange={(month) => setFilters({...filters, month})}
                onRefresh={refreshPayments}
                isAdmin={isAdmin}
              />
            }
          />
          <Route
            path="/calendar"
            element={
              <CalendarView
                db={db}
                payments={payments}
                members={members}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                isAdmin={isAdmin}
              />
            }
          />
          <Route
            path="/member/:id"
            element={
              <MemberView
                db={db}
                members={members}
                payments={payments}
                isAdmin={isAdmin}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <Settings
                db={db}
                members={members}
                payments={payments}
                onRefresh={refreshData}
                isAdmin={isAdmin}
              />
            }
          />
          <Route
            path="/tickets"
            element={
              <PaymentTickets
                supabase={supabase}
                currentUser={currentUser}
                isAdmin={isAdmin}
              />
            }
          />
          {isAdmin && (
            <Route
              path="/admin"
              element={
                <AdminPanel
                  isAdmin={isAdmin}
                  supabase={supabase}
                />
              }
            />
          )}
          {!isAdmin && (
            <Route
              path="/profile"
              element={
                <AthleteProfile
                  currentUser={currentUser}
                  onUpdate={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();
                      if (profile) {
                        setCurrentUser(profile);
                      }
                    }
                  }}
                />
              }
            />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
