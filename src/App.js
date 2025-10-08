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
import { getCurrentMonth, getCurrentMonthObj } from './utils/dateUtils';

function AppContent() {
  const { isAuthenticated, isAdmin, login, logout, loading } = useAuth();
  const [db] = useState(() => createAdapter(process.env.REACT_APP_DB_MODE || 'local'));
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [filters, setFilters] = useState({
    member_id: '',
    status: '',
    category: '',
    month: getCurrentMonthObj()
  });

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não autenticado, mostrar login
  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar isAdmin={isAdmin} onLogout={logout} />
      <main className="flex-1 ml-64">
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
                filters={filters}
                onFiltersChange={setFilters}
                onRefresh={refreshPayments}
                isAdmin={isAdmin}
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
