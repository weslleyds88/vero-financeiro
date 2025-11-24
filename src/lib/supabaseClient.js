import { createClient } from '@supabase/supabase-js';

// IMPORTANTE: Para usar com Supabase, você precisa:
// 1. Ir ao dashboard do Supabase (https://supabase.com/dashboard)
// 2. Selecionar seu projeto
// 3. Ir em Settings > API
// 4. Copiar a URL e a anon key
// 5. Configurar as variáveis de ambiente

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Configurações do Supabase não encontradas!');
  console.warn('📝 Para usar funcionalidades do Supabase, crie um arquivo .env.local na raiz do projeto com:');
  console.warn('   REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.warn('   REACT_APP_SUPABASE_ANON_KEY=sua-chave-anon-aqui');
  console.warn('💡 O app continuará funcionando em modo local sem essas configurações.');
}

// Criar cliente Supabase apenas se as credenciais estiverem disponíveis
// Caso contrário, retornar null para que os componentes possam verificar
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export default supabase;
