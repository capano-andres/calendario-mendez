import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import type { Feriado, Reunion, Sala } from './tipos';

export interface Catalogos {
  salas: Sala[];
  feriados: Map<string, string>;
  listaFeriados: Feriado[];
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
}

/** Salas y feriados. Se actualizan solos si alguien los cambia. */
export function useCatalogos(): Catalogos {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [listaFeriados, setListaFeriados] = useState<Feriado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    const [s, f] = await Promise.all([
      supabase.from('salas').select('*').order('orden'),
      supabase.from('feriados').select('*').order('fecha'),
    ]);
    const err = s.error ?? f.error;
    setError(err ? err.message : null);
    if (s.data) setSalas(s.data);
    if (f.data) setListaFeriados(f.data);
    setCargando(false);
  }, []);

  useEffect(() => {
    void recargar();
    const canal = supabase
      .channel('catalogos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feriados' }, () => void recargar())
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [recargar]);

  const feriados = useMemo(
    () => new Map(listaFeriados.map((f) => [f.fecha, f.descripcion])),
    [listaFeriados],
  );

  return {
    salas,
    listaFeriados,
    feriados,
    cargando,
    error,
    recargar,
  };
}

/** Reuniones entre dos instantes. Se actualiza en vivo cuando la secretaria cambia algo. */
export function useReuniones(desde: Date, hasta: Date) {
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [cargando, setCargando] = useState(true);
  const desdeIso = desde.toISOString();
  const hastaIso = hasta.toISOString();

  const recargar = useCallback(async () => {
    const { data } = await supabase
      .from('reuniones')
      .select('id, sala_id, cliente, asunto, notas, inicio, fin')
      .lt('inicio', hastaIso)
      .gt('fin', desdeIso)
      .order('inicio');
    if (data) setReuniones(data);
    setCargando(false);
  }, [desdeIso, hastaIso]);

  useEffect(() => {
    setCargando(true);
    void recargar();
    const canal = supabase
      .channel(`reuniones-${desdeIso}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reuniones' }, () => void recargar())
      .subscribe();
    // Recarga al volver a la pestaña, por si la conexión en vivo se cortó.
    const alVolver = () => document.visibilityState === 'visible' && void recargar();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      void supabase.removeChannel(canal);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [recargar, desdeIso]);

  return { reuniones, setReuniones, cargando, recargar };
}
