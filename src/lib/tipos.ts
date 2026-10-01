export type Rol = 'editor' | 'lector';

export interface Sala {
  id: string;
  nombre: string;
  orden: number;
  color: string;
}

export interface Feriado {
  fecha: string; // YYYY-MM-DD
  descripcion: string;
}

export interface Reunion {
  id: string;
  sala_id: string;
  cliente: string;
  asunto: string;
  notas: string;
  inicio: string; // ISO timestamptz
  fin: string; // ISO timestamptz
}

/** Datos que carga la secretaria en el formulario. */
export interface DatosReunion {
  sala_id: string;
  cliente: string;
  asunto: string;
  notas: string;
  fecha: string; // YYYY-MM-DD en hora de Argentina
  inicioMin: number; // minutos desde las 00:00
  duracionMin: number;
}
