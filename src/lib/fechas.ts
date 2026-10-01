import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/** Todas las fechas y horas de la app se interpretan en hora de Argentina. */
export const ZONA = 'America/Argentina/Buenos_Aires';

export const HORA_APERTURA = 8 * 60; // 08:00 en minutos
export const HORA_CIERRE = 18 * 60; // 18:00 en minutos
export const PASO_MIN = 15;
export const DURACIONES = [30, 45, 60, 90, 120, 180];
export const DURACION_POR_DEFECTO = 60;

/** Fecha de hoy en Argentina, formato YYYY-MM-DD. */
export function hoy(ahora: Date = new Date()): string {
  return formatInTimeZone(ahora, ZONA, 'yyyy-MM-dd');
}

function aFechaUTC(fecha: string): Date {
  return new Date(`${fecha}T00:00:00Z`);
}

export function sumarDias(fecha: string, dias: number): string {
  const d = aFechaUTC(fecha);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado */
export function diaSemana(fecha: string): number {
  return aFechaUTC(fecha).getUTCDay();
}

export function esFinDeSemana(fecha: string): boolean {
  const d = diaSemana(fecha);
  return d === 0 || d === 6;
}

/** Si la fecha cae sábado o domingo, devuelve el lunes siguiente. */
export function proximoDiaHabil(fecha: string): string {
  const d = diaSemana(fecha);
  if (d === 6) return sumarDias(fecha, 2);
  if (d === 0) return sumarDias(fecha, 1);
  return fecha;
}

/** Avanza o retrocede un día hábil (salta fines de semana). */
export function moverDiaHabil(fecha: string, sentido: 1 | -1): string {
  let f = sumarDias(fecha, sentido);
  while (esFinDeSemana(f)) f = sumarDias(f, sentido);
  return f;
}

export function lunesDeSemana(fecha: string): string {
  const d = diaSemana(fecha);
  const desplazamiento = d === 0 ? -6 : 1 - d;
  return sumarDias(fecha, desplazamiento);
}

/** Lunes a viernes de la semana que contiene la fecha. */
export function diasHabilesDeSemana(fecha: string): string[] {
  const lunes = lunesDeSemana(fecha);
  return [0, 1, 2, 3, 4].map((i) => sumarDias(lunes, i));
}

/** Convierte fecha + minutos (hora de Argentina) a un instante absoluto. */
export function aInstante(fecha: string, minutos: number): Date {
  const hh = String(Math.floor(minutos / 60)).padStart(2, '0');
  const mm = String(minutos % 60).padStart(2, '0');
  return fromZonedTime(`${fecha}T${hh}:${mm}:00`, ZONA);
}

/** Fecha (YYYY-MM-DD) en Argentina de un instante. */
export function fechaDe(instante: Date | string): string {
  return formatInTimeZone(new Date(instante), ZONA, 'yyyy-MM-dd');
}

/** Minutos desde las 00:00 (hora de Argentina) de un instante. */
export function minutosDe(instante: Date | string): number {
  const [h, m] = formatInTimeZone(new Date(instante), ZONA, 'HH:mm').split(':').map(Number);
  return h * 60 + m;
}

/** Duración en minutos entre dos instantes. */
export function duracionEntre(inicio: Date | string, fin: Date | string): number {
  return Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000);
}

export function formatoHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export function formatoDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return h === 1 ? '1 hora' : `${h} horas`;
  return `${h} h ${m} min`;
}

const formatoLargo = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const formatoCorto = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** "Lunes, 5 de octubre de 2026" */
export function formatoFechaLarga(fecha: string): string {
  const texto = formatoLargo.format(aFechaUTC(fecha));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "lun 5 oct" */
export function formatoFechaCorta(fecha: string): string {
  return formatoCorto.format(aFechaUTC(fecha)).replace(/\./g, '').replace(',', '');
}

/** Horas de inicio posibles: 8:00, 8:15 ... 17:45 */
export function horariosDeInicio(): number[] {
  const lista: number[] = [];
  for (let m = HORA_APERTURA; m < HORA_CIERRE; m += PASO_MIN) lista.push(m);
  return lista;
}

export function redondearAPaso(minutos: number): number {
  return Math.round(minutos / PASO_MIN) * PASO_MIN;
}
