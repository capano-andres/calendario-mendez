import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { EMAIL_LECTURA, EMAIL_SECRETARIA, supabase } from '../lib/supabase';
import type { Rol } from '../lib/tipos';

interface EstadoAuth {
  session: Session | null;
  rol: Rol | null;
  esEditora: boolean;
  cargando: boolean;
  ingresar: (tipo: Rol, clave: string) => Promise<string | null>;
  salir: () => Promise<void>;
}

const Contexto = createContext<EstadoAuth | null>(null);

function rolDe(session: Session | null): Rol | null {
  if (!session) return null;
  return session.user.app_metadata?.rol === 'editor' ? 'editor' : 'lector';
}

export function ProveedorAuth({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    // Al abrir la app se renueva la sesión para tomar cambios de rol hechos en Supabase.
    supabase.auth.getSession().then(async ({ data }) => {
      let actual = data.session;
      if (actual) {
        const renovada = await supabase.auth.refreshSession();
        if (renovada.data.session) actual = renovada.data.session;
      }
      setSession(actual);
      setCargando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  async function ingresar(tipo: Rol, clave: string): Promise<string | null> {
    const email = tipo === 'editor' ? EMAIL_SECRETARIA : EMAIL_LECTURA;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: clave });
    if (error) {
      if (error.message.includes('Invalid login')) return 'Clave incorrecta.';
      if (error.message.includes('not confirmed')) {
        return 'La cuenta no está confirmada. En Supabase, vuelve a crearla marcando "Auto Confirm User".';
      }
      return error.message;
    }
    if (tipo === 'editor' && rolDe(data.session) !== 'editor') {
      await supabase.auth.signOut();
      return 'La clave es correcta, pero esta cuenta no tiene el rol de secretaria. Ejecuta 00_instalar_todo.sql en Supabase y vuelve a intentar.';
    }
    return null;
  }

  async function salir() {
    await supabase.auth.signOut();
  }

  const rol = rolDe(session);
  return (
    <Contexto.Provider
      value={{ session, rol, esEditora: rol === 'editor', cargando, ingresar, salir }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useAuth(): EstadoAuth {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAuth debe usarse dentro de ProveedorAuth');
  return ctx;
}
