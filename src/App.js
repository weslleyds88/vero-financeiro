import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { createAdapter } from './adapters';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Members from './components/Members';
import Payments from './components/Payments';
import Expenses from './components/Expenses';
import CalendarView from './components/CalendarView';
import MemberView from './components/MemberView';
import Settings from './components/Settings';
import { getCurrentMonth, getCurrentMonthObj } from './utils/dateUtils';

function App() {
  const [db] = useState(() => createAdapter(process.env.REACT_APP_DB_MODE || 'local'));
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [filters, setFilters] = useState({
    member_id: '',
    status: '',
    category: '',
    month: getCurrentMonthObj()
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, paymentsData] = await Promise.all([
        db.listMembers(),
        db.listPayments()
      ]);
      setMembers(membersData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshMembers = async () => {
    const membersData = await db.listMembers();
    setMembers(membersData);
  };

  const refreshPayments = async () => {
    const paymentsData = await db.listPayments();
    setPayments(paymentsData);
  };

  const refreshData = () => {
    loadData();
  };

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

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
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
                />
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
