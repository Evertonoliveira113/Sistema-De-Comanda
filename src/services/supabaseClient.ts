import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

// Inicialização segura para evitar o erro "supabaseUrl is required" no carregamento do módulo
let client: any = null;

// Usamos um Proxy para que o objeto 'supabase' possa ser importado normalmente,
// mas só instancie o cliente real quando for acessado e se as chaves existirem.
export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id')) {
      const msg = 'Configuração do Supabase inválida ou ausente. Por favor, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no painel de Secrets com os valores do seu projeto Supabase.';
      
      if (typeof prop === 'string' && ['from', 'auth', 'storage', 'rpc'].includes(prop)) {
        return (...args: any[]) => {
          console.error(msg, { method: prop, args });
          return Promise.reject(new Error(msg));
        };
      }
      return undefined;
    }

    if (!client) {
      try {
        client = createClient(supabaseUrl, supabaseAnonKey);
      } catch (e) {
        console.error('Erro ao criar cliente Supabase:', e);
      }
    }
    
    if (!client) return undefined;

    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
