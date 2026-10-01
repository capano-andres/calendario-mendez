import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(url && clave);

export const supabase = createClient(url || 'http://localhost', clave || 'sin-configurar', {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const EMAIL_LECTURA =
  (import.meta.env.VITE_EMAIL_LECTURA as string | undefined) || 'lectura@example.com';
export const EMAIL_SECRETARIA =
  (import.meta.env.VITE_EMAIL_SECRETARIA as string | undefined) || 'secretaria@example.com';
