import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && key && !url.includes('TU_PROJECT_REF'));

// Solo se usa para autenticación; los datos siempre pasan por nuestra API.
export const supabase = createClient(supabaseConfigured ? url : 'http://localhost', supabaseConfigured ? key : 'missing');
