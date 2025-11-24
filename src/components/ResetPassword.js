import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function ResetPassword({ onSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Verificar token de reset da URL
  useEffect(() => {
    const checkToken = async () => {
      // Ler token e email da URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlToken = hashParams.get('token');
      const urlEmail = hashParams.get('email');

      if (!urlToken || !urlEmail) {
        setError('Link de reset inválido. Solicite um novo reset de senha.');
        setCheckingSession(false);
        return;
      }

      try {
        // Validar token usando Edge Function
        const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
        if (!supabaseUrl) {
          throw new Error('URL do Supabase não configurada');
        }

        const functionUrl = `${supabaseUrl}/functions/v1/verify-reset-token`;
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({ token: urlToken, email: urlEmail }),
        });

        const data = await response.json();

        if (!response.ok || !data.valid) {
          setError('Link de reset expirado ou inválido. Solicite um novo reset de senha.');
          setCheckingSession(false);
          return;
        }

        // Token válido, permitir reset
        setSessionReady(true);
        setCheckingSession(false);
      } catch (err) {
        console.error('❌ Erro ao verificar token:', err);
        setError('Erro ao verificar link. Tente clicar no link do email novamente.');
        setCheckingSession(false);
      }
    };

    checkToken();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!sessionReady) {
      setError('Aguarde a validação do link...');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      // Ler token e email da URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const urlToken = hashParams.get('token');
      const urlEmail = hashParams.get('email');

      if (!urlToken || !urlEmail) {
        throw new Error('Token ou email não encontrado na URL');
      }

      // Atualizar senha usando Edge Function
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('URL do Supabase não configurada');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/verify-reset-token`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY || '',
        },
        body: JSON.stringify({ 
          token: urlToken, 
          email: urlEmail,
          newPassword: password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar senha');
      }

      alert('✅ Senha alterada com sucesso! Faça login com sua nova senha.');
      window.location.hash = '';
      onSuccess();
    } catch (error) {
      console.error('❌ Erro ao resetar senha:', error);
      setError(error.message || 'Erro ao resetar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full md:max-w-md">
          <div className="card p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Verificando link de reset...</p>
            <p className="text-sm text-gray-500 mt-2">Aguarde até 60 segundos</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full md:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏐 Vero Clube
          </h1>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Criar Nova Senha</h2>
          <p className="text-gray-600 mt-2">
            Digite sua nova senha para recuperar o acesso à sua conta
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            {!sessionReady && !error && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                ⏳ Aguardando sessão ser estabelecida...
              </div>
            )}
            
            {sessionReady && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                ✅ Link validado! Você pode criar sua nova senha.
              </div>
            )}

            <div>
              <label htmlFor="password" className="label">
                Nova Senha *
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirmar Nova Senha *
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Digite a senha novamente"
                required
                minLength={6}
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || !sessionReady}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Alterando...' : '✓ Alterar Senha'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary"
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              💡 Dica: Use uma senha forte com letras, números e símbolos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;

