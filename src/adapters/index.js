// Factory para criar o adapter apropriado
import LocalAdapter from './localAdapter';
import SupabaseAdapter from './supabaseAdapter';

export const createAdapter = (mode = 'local') => {
  switch (mode) {
    case 'supabase':
      return new SupabaseAdapter();
    case 'local':
    default:
      return new LocalAdapter();
  }
};

export { LocalAdapter, SupabaseAdapter };
