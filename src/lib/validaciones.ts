import {
  HORA_APERTURA,
  HORA_CIERRE,
  PASO_MIN,
  aInstante,
  esFinDeSemana,
  formatoHora,
  minutosDe,
} from './fechas';
import type { Reunion } from './tipos';

export interface Horario {
  fecha: string;
  inicioMin: number;
  duracionMin: number;
}

/** Devuelve un mensaje de error si el horario no es válido, o null si está bien. */
export function validarHorario(h: Horario, feriados: Map<string, string>): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(h.fecha)) return 'Elige una fecha.';
  if (esFinDeSemana(h.fecha)) return 'No se pueden agendar reuniones los fines de semana.';
  const feriado = feriados.get(h.fecha);
  if (feriado) return `Ese día es feriado (${feriado}).`;
  if (h.duracionMin <= 0) return 'La duración debe ser mayor a cero.';
  if (h.inicioMin % PASO_MIN !== 0 || h.duracionMin % PASO_MIN !== 0) {
    return 'Los horarios van en intervalos de 15 minutos.';
  }
  if (h.inicioMin < HORA_APERTURA) return 'Las reuniones empiezan a partir de las 8:00.';
  if (h.inicioMin + h.duracionMin > HORA_CIERRE) {
    return `La reunión terminaría a las ${formatoHora(h.inicioMin + h.duracionMin)}. El horario es hasta las 18:00.`;
  }
  return null;
}

/** Busca una reunión de la misma sala que se superponga con el intervalo dado. */
export function buscarChoque(
  salaId: string,
  inicio: Date,
  fin: Date,
  existentes: Reunion[],
  ignorarId?: string,
): Reunion | null {
  for (const r of existentes) {
    if (r.sala_id !== salaId || r.id === ignorarId) continue;
    const rIni = new Date(r.inicio).getTime();
    const rFin = new Date(r.fin).getTime();
    if (inicio.getTime() < rFin && rIni < fin.getTime()) return r;
  }
  return null;
}

export function mensajeChoque(r: Reunion, nombreSala: string): string {
  return `${nombreSala} está ocupada de ${formatoHora(minutosDe(r.inicio))} a ${formatoHora(
    minutosDe(r.fin),
  )} por la reunión con ${r.cliente}.`;
}

/** Convierte el horario del formulario a inicio/fin absolutos. */
export function intervaloDe(h: Horario): { inicio: Date; fin: Date } {
  return {
    inicio: aInstante(h.fecha, h.inicioMin),
    fin: aInstante(h.fecha, h.inicioMin + h.duracionMin),
  };
}

/** Traduce errores de Supabase/Postgres a mensajes entendibles. */
export function traducirError(error: { code?: string; message?: string } | null): string {
  if (!error) return 'Ocurrió un error desconocido.';
  switch (error.code) {
    case '23P01':
      return 'La sala ya está ocupada en ese horario.';
    case '42501':
      return 'No tienes permiso para hacer cambios. Solo la secretaria puede editar.';
    case '23503':
      return 'No se puede borrar porque hay reuniones que lo usan. Puedes desactivarlo en su lugar.';
    case '23505':
      return 'Ya existe un registro con ese nombre o fecha.';
    case 'P0001':
      return error.message ?? 'Datos inválidos.';
  }
  if (error.message?.includes('row-level security')) {
    return 'No tienes permiso para hacer cambios. Solo la secretaria puede editar.';
  }
  return error.message ?? 'Ocurrió un error desconocido.';
}
