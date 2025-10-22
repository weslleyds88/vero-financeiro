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
  console.error('Configurações do Supabase não encontradas!');
  console.error('Certifique-se de configurar:');
  console.error('- REACT_APP_SUPABASE_URL');
  console.error('- REACT_APP_SUPABASE_ANON_KEY');
  console.error('no arquivo .env.local');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export default supabase;
