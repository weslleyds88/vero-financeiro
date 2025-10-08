import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Credenciais fixas: admin / admin123
    if (username === 'admin' && password === 'admin123') {
      onLogin(true);
      setError('');
    } else {
      setError('Usuário ou senha incorretos');
    }
  };

  const handleViewMode = () => {
    onLogin(false); // Modo visualização
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏐 Despesas Vero
          </h1>
          <p className="text-gray-600">
            Sistema de Gestão Financeira
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Usuário</label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite o usuário"
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
            >
              🔓 Entrar como Administrador
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleViewMode}
              className="btn-secondary w-full"
            >
              👁️ Entrar em Modo Visualização
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-3">
              Modo visualização: apenas consulta, sem edições
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
