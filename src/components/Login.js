import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Register from './Register';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [useSupabase, setUseSupabase] = useState(false);

  // Verificar se Supabase está configurado
  useEffect(() => {
    setUseSupabase(!!supabase);
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Se Supabase está configurado, usar autenticação Supabase
    if (supabase && useSupabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            try {
              await supabase.auth.resend({
                type: 'signup',
                email: email,
              });
              setError('Email de confirmação enviado. Verifique sua caixa de entrada.');
              setLoading(false);
              return;
            } catch (resendError) {
              console.log('Erro ao reenviar confirmação:', resendError);
            }
          }
          throw error;
        }

        if (data.user) {
          // Verificar se o usuário está aprovado
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profileError && !profile) {
              setError('Perfil não encontrado. Entre em contato com o administrador.');
              setLoading(false);
              return;
            }

            if (profile?.account_status === 'inactive') {
              setError('Sua conta foi desativada. Entre em contato com o administrador.');
              await supabase.auth.signOut();
              setLoading(false);
              return;
            }

            if (profile?.status === 'approved' || profile?.role === 'admin') {
              onLogin(profile.role === 'admin', profile);
            } else {
              setError('Sua conta ainda não foi aprovada pelo administrador.');
            }
          } catch (networkError) {
            console.error('❌ Erro de rede:', networkError);
            setError('Erro de conexão. Verifique sua internet e tente novamente.');
          }
        }
      } catch (error) {
        setError(error.message || 'Erro ao fazer login');
      } finally {
        setLoading(false);
      }
    } else {
      // Modo local (fallback)
    if (username === 'admin' && password === 'admin123') {
      onLogin(true);
      setError('');
    } else {
      setError('Usuário ou senha incorretos');
      }
      setLoading(false);
    }
  };

  const handleViewMode = () => {
    onLogin(false); // Modo visualização
  };

  const handleRegisterSuccess = (email) => {
    setError(`Conta criada com sucesso! Um email foi enviado para ${email}. Aguarde a aprovação do administrador.`);
    setShowRegister(false);
  };


  if (showRegister) {
    return (
      <Register
        onRegisterSuccess={handleRegisterSuccess}
        onBackToLogin={() => setShowRegister(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full md:max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏐 Vero Clube
          </h1>
          <p className="text-gray-600">
            Sistema de Gestão Financeira
          </p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {useSupabase ? (
              <>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Digite seu email"
                    required
                  />
                </div>
                <div>
                  <label className="label">Senha</label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    required
                  />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}

            {error && (
              <div className={`px-4 py-3 rounded-lg ${
                error.includes('sucesso')
                  ? 'bg-green-50 border border-green-200 text-green-600'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
              }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3 touch-manipulation"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Entrando...
                </>
              ) : (
                '🔓 Entrar'
              )}
            </button>
          </form>

          {useSupabase && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowRegister(true)}
                className="btn-outline w-full py-3 touch-manipulation"
              >
                📝 Criar Nova Conta
              </button>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-3">
                Não tem conta? Cadastre-se como atleta
              </p>
            </div>
          )}

          {!useSupabase && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleViewMode}
              className="btn-secondary w-full py-3 touch-manipulation"
            >
              👁️ Entrar em Modo Visualização
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-3">
              Modo visualização: apenas consulta, sem edições
            </p>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
