import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const clave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(url && clave);

export const supabase = createClient(url || 'http://localhost', clave || 'sin-configurar', {
  auth: { persistSession: true, autoRefreshToken: true },
});

/**
 * Mientras sea true, "Ver calendario" entra sin clave (requiere 07_ver_sin_clave.sql en Supabase).
 * Para volver a pedir clave: variable VITE_VER_SIN_CLAVE=false y ejecutar la parte final de ese archivo.
 */
export const VER_SIN_CLAVE = import.meta.env.VITE_VER_SIN_CLAVE !== 'false';

export const EMAIL_LECTURA =
  (import.meta.env.VITE_EMAIL_LECTURA as string | undefined) || 'lectura@example.com';
export const EMAIL_SECRETARIA =
  (import.meta.env.VITE_EMAIL_SECRETARIA as string | undefined) || 'secretaria@example.com';
