import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Carregar estado de autenticação do localStorage
  useEffect(() => {
    const authData = localStorage.getItem('auth');
    if (authData) {
      const { isAuth, isAdm } = JSON.parse(authData);
      setIsAuthenticated(isAuth);
      setIsAdmin(isAdm);
    }
    setLoading(false);
  }, []);

  // Salvar estado no localStorage quando mudar
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('auth', JSON.stringify({
        isAuth: isAuthenticated,
        isAdm: isAdmin
      }));
    }
  }, [isAuthenticated, isAdmin, loading]);

  const login = (adminMode) => {
    setIsAuthenticated(true);
    setIsAdmin(adminMode);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    localStorage.removeItem('auth');
  };

  const value = {
    isAuthenticated,
    isAdmin,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
